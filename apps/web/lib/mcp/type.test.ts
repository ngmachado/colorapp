import { makeTestFont } from '@sca/type-engine/testing';
import { describe, expect, test } from 'vitest';
import type { CatalogueFace } from '@/lib/catalogue';
import { Refusal } from './tools';
import { lookupFace, measureSetting, type TypeDeps } from './type';

const FILE = 'https://fonts.gstatic.com/s/testsans/v1/testsans.ttf';
const families: CatalogueFace[] = [
  {
    family: 'Test Sans',
    category: 'sans-serif',
    subsets: ['latin', 'latin-ext'],
    files: { regular: FILE, '500': FILE, '600': FILE, '700': FILE },
  },
  {
    family: 'Test Serif',
    category: 'serif',
    axes: [{ tag: 'wght', start: 300, end: 800 }],
    subsets: ['latin', 'cyrillic'],
    files: { regular: 'https://fonts.gstatic.com/s/testserif/v1/testserif.ttf' },
  },
];
/** Every letter 500 units wide and the space 250: an average advance of 0.4907 em. */
const font = makeTestFont();
const deps: TypeDeps = {
  catalogue: async () => families,
  file: async (url) => {
    if (url !== FILE) throw new Error('not served');
    return font;
  },
};
const noCatalogue: TypeDeps = { catalogue: async () => null, file: deps.file };

describe('a setting measured as the page measures it', () => {
  test('without a face: scale, styles, contrast and spacing, and no count per line', async () => {
    const r = await measureSetting({}, deps);
    expect(r.face).toBeNull();
    expect(r.setting).toMatchObject({ base: 16, ratio: 1.25, ratioName: 'major third 5:4' });
    expect(r.scale.steps.find((s) => s.step === 0)?.px).toBe(16);
    expect(r.measure.charactersPerLine).toBeNull();
    expect(r.measure.note).toContain('needs a face');
    const body = r.styles.find((s) => s.style === 'body')!;
    expect(body).toMatchObject({ px: 16, weight: 400, leading: 1.5, lineHeightPx: 24 });
    expect(body.text.hex).toBe('#1b1b1f');
    expect(body.wcag.aa).toEqual({ minimum: 4.5, passes: true, criterion: '1.4.3' });
    expect(body.apca.note).toContain('WCAG 3 draft');
    const display = r.styles.find((s) => s.style === 'display')!;
    expect(display.wcag.large).toBe(true);
    expect(r.spacing).toMatchObject({ applied: false, criterion: '1.4.12' });
    // The claims carry the records' own words and the sources; an unverified locator is not given.
    expect(r.measure.claim.citation!.locator).toBe('Section 2.1.2');
    expect(r.measure.claim.citation!.source.id).toBe('bringhurst-2012-elements-v4');
    expect(r.leading.claim.citation!.locator).toBeNull();
    expect(JSON.stringify(r)).not.toMatch(/to verify|review_state|discovered/);
    expect(r.links.type).toMatch(/\/type$/);
    expect(r.links.laboratory).toContain('/lab?hex=2a6fbd,');
  });

  test('with a face: the count per line comes from the file and the link carries the setting', async () => {
    const r = await measureSetting(
      {
        face: 'test sans',
        measure: 600,
        colours: ['#000000', '#ffffff', '#2a6fbd'],
        styles: [{ style: 'body', text: 0, background: 1 }],
        spacing: true,
      },
      deps,
    );
    expect(r.face).toMatchObject({ family: 'Test Sans', read: true });
    expect((r.face as { file: { designer: string } }).file.designer).toBe('A tester');
    // (600 − 36) px over an advance of 16 × 0.4907 px.
    expect(r.measure.charactersPerLine).toBe(71);
    expect(r.measure.placement).toBe('within');
    expect(r.styles.find((s) => s.style === 'body')!.wcag.ratio).toBe(21);
    expect(r.setting.spacing).toBe(true);
    expect(r.links.type).toContain('face=Test%20Sans');
    expect(r.links.type).toContain('measure=600');
    expect(r.links.type).toContain('spacing=1');
  });

  test('limits are refused, not clamped; an unknown face is refused with the names that contain it', async () => {
    await expect(measureSetting({ base: 40 }, deps)).rejects.toThrow(
      'base is a number from 10 to 32',
    );
    await expect(
      measureSetting(
        { colours: ['#000', '#fff'], styles: [{ style: 'body', text: 0, background: 0 }] },
        deps,
      ),
    ).rejects.toThrow('two different indexes');
    await expect(measureSetting({ face: 'Nope' }, deps)).rejects.toThrow('No face named "Nope"');
    const err = await measureSetting({ face: 'test' }, deps).catch((e: Refusal) => e);
    expect(err).toBeInstanceOf(Refusal);
    expect((err as Refusal).detail).toEqual({ faces: ['Test Sans', 'Test Serif'] });
  });

  test('without a catalogue the setting is still measured and the face is reported unread', async () => {
    const r = await measureSetting({ face: 'Test Sans' }, noCatalogue);
    expect(r.face).toMatchObject({ family: 'Test Sans', read: false });
    expect(r.measure.charactersPerLine).toBeNull();
    expect(r.styles).toHaveLength(4);
  });
});

describe('a face looked up', () => {
  test('catalogue facts and the file’s reading, with the links', async () => {
    const r = await lookupFace('Test Sans', deps);
    expect(r.catalogue).toMatchObject({ built: 'static', weights: [400, 500, 600, 700] });
    expect(r.catalogue.category.note).toContain('Google Fonts');
    expect(r.setsLaboratoryWeights).toBe(true);
    expect(r.file).toMatchObject({ unitsPerEm: 1000, license: 'SIL Open Font License 1.1' });
    expect(r.file!.coverage[0]).toMatchObject({ block: 'Basic Latin' });
    expect(r.links.specimen).toBe('https://fonts.google.com/specimen/Test+Sans');
    expect(r.links.type).toContain('/type?face=Test%20Sans');
  });

  test('a file that cannot be read leaves the catalogue facts with a note; no catalogue is a refusal', async () => {
    const r = await lookupFace('Test Serif', deps);
    expect(r.file).toBeNull();
    expect(r.note).toContain('could not be read');
    expect(r.catalogue).toMatchObject({ built: 'variable' });
    await expect(lookupFace('Test Sans', noCatalogue)).rejects.toThrow('No catalogue');
    await expect(lookupFace('  ', deps)).rejects.toThrow(Refusal);
  });
});
