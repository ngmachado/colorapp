import { z } from 'zod';
import { neutralRoles } from './rules';
import { GeneratorParams, type ConstraintProblem, type GeneratorParamsInput } from './types';

export function hueArc(hue: { from: number; to: number } | undefined): {
  from: number;
  span: number;
} {
  if (!hue) return { from: 0, span: 360 };
  const from = ((hue.from % 360) + 360) % 360;
  const to = ((hue.to % 360) + 360) % 360;
  const span = to >= from ? to - from : 360 - from + to;
  return { from, span: span === 0 ? 360 : span };
}

export function hueInArc(h: number, arc: { from: number; span: number }): boolean {
  const d = (((h - arc.from) % 360) + 360) % 360;
  return d <= arc.span + 1e-9;
}

/**
 * Parses and checks parameters. A conflict is explained, never silently resolved:
 * locks are not moved into bounds, and a structure that cannot be satisfied is refused.
 */
export function validateParams(input: GeneratorParamsInput): {
  params: GeneratorParams;
  problems: ConstraintProblem[];
} {
  const parsed = GeneratorParams.safeParse(input);
  if (!parsed.success) {
    return {
      params: null as unknown as GeneratorParams,
      problems: parsed.error.issues.map((i) => ({
        field: i.path.join('.') || '(root)',
        message: i.message,
      })),
    };
  }
  const p = parsed.data;
  const problems: ConstraintProblem[] = [];
  const arc = hueArc(p.bounds.hue);
  const { lightness, chroma } = p.bounds;

  for (const [role, lock] of Object.entries(p.locks)) {
    if (!lock) continue;
    if (!p.roles.includes(role as (typeof p.roles)[number]))
      problems.push({
        field: `locks.${role}`,
        message: `${role} is locked but is not one of the roles ${p.roles.join(', ')}`,
      });
    const [l, c, h] = lock;
    if (l < lightness.min || l > lightness.max)
      problems.push({
        field: `locks.${role}`,
        message: `${role} is locked to lightness ${l} but the lightness bounds are ${lightness.min}..${lightness.max}`,
      });
    if (c < chroma.min || c > chroma.max)
      problems.push({
        field: `locks.${role}`,
        message: `${role} is locked to chroma ${c} but the chroma bounds are ${chroma.min}..${chroma.max}`,
      });
    if (c >= p.neutralThreshold && !hueInArc(h, arc))
      problems.push({
        field: `locks.${role}`,
        message: `${role} is locked to hue ${h}° but the hue arc is ${arc.from}° to ${(arc.from + arc.span) % 360}°`,
      });
    if (neutralRoles(p).includes(role as 'dominant') && c >= p.neutralThreshold)
      problems.push({
        field: `locks.${role}`,
        message: `${role} must be near-neutral (chroma < ${p.neutralThreshold}) under neutral-accent but is locked to chroma ${c}`,
      });
  }

  if (p.structure === 'neutral-accent') {
    if (!p.roles.includes('accent'))
      problems.push({ field: 'roles', message: 'neutral-accent needs an accent role' });
    if (chroma.min >= p.neutralThreshold)
      problems.push({
        field: 'bounds.chroma',
        message: `neutral-accent needs chroma below ${p.neutralThreshold} but the chroma bounds start at ${chroma.min}`,
      });
  }
  const needsTwoHues = ['complementary', 'split-complementary', 'triadic', 'tetradic'].includes(
    p.structure,
  );
  if (needsTwoHues && p.roles.length < 2)
    problems.push({ field: 'roles', message: `${p.structure} needs at least two roles` });
  if (needsTwoHues && arc.span < 180)
    problems.push({
      field: 'bounds.hue',
      message: `${p.structure} places hues 180° apart but the hue arc spans only ${arc.span}°`,
    });
  if (p.structure === 'mutation' || p.strategy === 'nearby' || p.strategy === 'distant') {
    if (!p.seedPalette)
      problems.push({
        field: 'seedPalette',
        message: `${p.structure === 'mutation' ? 'mutation' : p.strategy} needs a seedPalette`,
      });
    else if (p.seedPalette.length !== p.roles.length)
      problems.push({
        field: 'seedPalette',
        message: `seedPalette has ${p.seedPalette.length} entries but there are ${p.roles.length} roles`,
      });
  }
  if (p.structure === 'source-led' && !(p.sourceColours && p.sourceColours.length))
    problems.push({
      field: 'sourceColours',
      message: 'source-led needs at least one source colour',
    });
  if (p.baseHue !== undefined && arc.span < 360 && !hueInArc(((p.baseHue % 360) + 360) % 360, arc))
    problems.push({
      field: 'baseHue',
      message: `base hue ${p.baseHue}° is outside the hue arc ${arc.from}° to ${(arc.from + arc.span) % 360}°`,
    });
  if (p.subset > p.count)
    problems.push({
      field: 'subset',
      message: `subset ${p.subset} is larger than count ${p.count}`,
    });

  return { params: p, problems };
}

export type ValidatedParams = z.infer<typeof GeneratorParams>;
