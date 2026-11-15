import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { expect, test } from '@playwright/test';

/** A key made on the account page, as a person would. */
async function makeKey(page: import('@playwright/test').Page, name: string, writes = false) {
  await page.goto(`/api/test/login?email=mcp-${test.info().project.name}@example.com`);
  await page.goto('/account');
  await page.getByLabel('Name of the new key').fill(name);
  if (writes) await page.getByTestId('key-writes').check();
  await page.getByTestId('create-key').click();
  const secret = (await page.getByTestId('new-key-secret').textContent())!.trim();
  await page.getByRole('button', { name: 'Done' }).click();
  return secret;
}

test('the MCP server answers an agent over its API key: instructions, tools, resources, prompt', async ({
  page,
  request,
  baseURL,
}) => {
  const secret = await makeKey(page, 'An agent');
  const url = `${baseURL}/api/mcp`;

  // The account page tells the person where to point an agent.
  await expect(page.locator('#mcp')).toContainText('claude mcp add --transport http supercolour');

  // No key, no answer; sessions are not a thing here.
  const init = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'x', version: '0' },
    },
  };
  expect((await request.post('/api/mcp', { data: init })).status()).toBe(401);
  expect((await request.get('/api/mcp')).status()).toBe(405);

  const client = new Client({ name: 'e2e', version: '0' });
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: { headers: { authorization: `Bearer ${secret}` } },
  });
  await client.connect(transport);
  expect(client.getInstructions()).toContain('State needs as numbers, not moods.');

  const tools = (await client.listTools()).tools.map((t) => t.name).sort();
  expect(tools).toEqual([
    'check_palette',
    'colour_of_the_day',
    'contrast_pair',
    'delete_saved',
    'find_records',
    'get_palette',
    'inspect_colour',
    'list_library',
    'lookup_face',
    'lookup_record',
    'measure_setting',
    'request_palette',
    'restore_saved',
    'save_colour',
    'save_palette',
  ]);

  const inspected = await client.callTool({
    name: 'inspect_colour',
    arguments: { colour: '#960018' },
  });
  const body = inspected.structuredContent as {
    hex: string;
    nearby: { distance: { value: number } }[];
  };
  expect(body.hex).toBe('#960018');
  expect(body.nearby).toHaveLength(5);

  const refused = await client.callTool({
    name: 'request_palette',
    arguments: { words: 'warm' },
  });
  expect(refused.isError).toBe(true);
  expect(JSON.stringify(refused.content)).toContain('hue arc');

  const drawn = await client.callTool({
    name: 'request_palette',
    arguments: {
      seed: 2,
      count: 30,
      contrast: [{ text: 'accent', background: 'dominant', minimum: 3 }],
    },
  });
  const palette = drawn.structuredContent as { palette: unknown[]; links: { laboratory: string } };
  expect(palette.palette).toHaveLength(3);
  expect(palette.links.laboratory).toContain('/lab?palette=');

  const today = await client.callTool({
    name: 'colour_of_the_day',
    arguments: { date: '2026-11-13' },
  });
  expect((today.structuredContent as { colour: { hex: string } }).colour.hex).toMatch(
    /^#[0-9a-f]{6}$/,
  );

  const resources = (await client.listResources()).resources;
  expect(resources.some((r) => r.uri === 'supercolour://colour-of-the-day')).toBe(true);
  expect(resources.some((r) => r.uri === 'supercolour://guide')).toBe(true);
  expect(resources.some((r) => r.uri === 'supercolour://systems/zh-wuxing')).toBe(true);
  expect(resources.some((r) => r.uri.startsWith('supercolour://lessons/'))).toBe(true);
  const textOf = (r: { contents: unknown[] }) => (r.contents[0] as { text: string }).text;
  const guide = await client.readResource({ uri: 'supercolour://guide' });
  expect(textOf(guide)).toContain('# Super Colour for agents');
  const record = await client.readResource({ uri: 'supercolour://records/zh-yanzhi' });
  expect(JSON.parse(textOf(record))).toMatchObject({ type: 'concept', id: 'zh-yanzhi' });

  const prompt = await client.getPrompt({ name: 'palette', arguments: { brief: 'a reading app' } });
  const text = prompt.messages[0]!.content as { type: 'text'; text: string };
  expect(text.text).toContain('a reading app');
  expect(text.text).toContain('Do not guess a hue for a mood.');
  await client.close();

  // Every request counted on the key.
  const quota = await request.get('/api/key', { headers: { authorization: `Bearer ${secret}` } });
  const used = ((await quota.json()) as { quota: { month: { used: number } } }).quota.month.used;
  expect(used).toBeGreaterThanOrEqual(8);
});

test('a key made to save lets an agent keep, delete and restore Library items; a plain key cannot', async ({
  page,
  baseURL,
}) => {
  const reader = await makeKey(page, 'reader');
  const writer = await makeKey(page, 'writer', true);
  await expect(page.getByTestId('api-key').filter({ hasText: 'writer' })).toContainText(
    'saves to the Library',
  );
  await expect(page.getByTestId('api-key').filter({ hasText: 'reader' })).not.toContainText(
    'saves to the Library',
  );
  const connect = async (secret: string) => {
    const client = new Client({ name: 'e2e', version: '0' });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${baseURL}/api/mcp`), {
        requestInit: { headers: { authorization: `Bearer ${secret}` } },
      }),
    );
    return client;
  };
  const args = {
    name: 'Reading app',
    colours: ['#1a1a1a', '#f4f1ea', '#960018'],
    names: ['text', 'paper', 'accent'],
    records: [null, null, 'zh-yanzhi'],
    pairs: [{ text: 0, background: 1 }],
  };

  const r = await connect(reader);
  const refused = await r.callTool({ name: 'save_palette', arguments: args });
  expect(refused.isError).toBe(true);
  expect(JSON.stringify(refused.content)).toContain('cannot change it');
  const empty = (await r.callTool({ name: 'list_library', arguments: {} })).structuredContent as {
    palettes: unknown[];
    key: { mayWrite: boolean };
  };
  expect(empty.palettes).toEqual([]);
  expect(empty.key.mayWrite).toBe(false);
  await r.close();

  const w = await connect(writer);
  const saved = (await w.callTool({ name: 'save_palette', arguments: args })).structuredContent as {
    saved: { number: number };
    palette: { savedBy: string; links: { laboratory: string } };
  };
  expect(saved.saved.number).toBe(1);
  expect(saved.palette.savedBy).toBe('writer');
  expect(saved.palette.links.laboratory).toContain('pairs=0-1');
  const colour = (await w.callTool({ name: 'save_colour', arguments: { record: 'zh-yanzhi' } }))
    .structuredContent as { saved: { already: boolean } };
  expect(colour.saved.already).toBe(false);
  const again = (await w.callTool({ name: 'save_colour', arguments: { record: 'zh-yanzhi' } }))
    .structuredContent as { saved: { already: boolean } };
  expect(again.saved.already).toBe(true);

  await page.goto('/library');
  await expect(page.getByTestId('saved-palette')).toHaveCount(1);
  await expect(page.getByLabel('Name of version 1')).toHaveValue('Reading app');
  await expect(page.getByTestId('saved-colour')).toHaveCount(1);

  const gone = await w.callTool({
    name: 'delete_saved',
    arguments: { kind: 'palette', number: 1 },
  });
  expect(gone.isError).toBeFalsy();
  await page.reload();
  await expect(page.getByTestId('saved-palette')).toHaveCount(0);
  await expect(page.getByTestId('deleted-item')).toHaveCount(1);
  const listed = (await w.callTool({ name: 'list_library', arguments: {} })).structuredContent as {
    palettes: unknown[];
    deleted: { palettes: { number: number }[] };
  };
  expect(listed.palettes).toEqual([]);
  expect(listed.deleted.palettes[0]!.number).toBe(1);

  const back = await w.callTool({
    name: 'restore_saved',
    arguments: { kind: 'palette', number: 1 },
  });
  expect(back.isError).toBeFalsy();
  await page.reload();
  await expect(page.getByTestId('saved-palette')).toHaveCount(1);
  await expect(page.getByTestId('deleted-item')).toHaveCount(0);

  // Removing for good is the person's click, and the agent cannot restore after it.
  await page.getByTestId('delete-palette').click();
  await expect(page.getByTestId('deleted-item')).toHaveCount(1);
  await page.getByTestId('purge-item').click();
  await expect(page.getByTestId('deleted-item')).toHaveCount(0);
  const nothing = await w.callTool({
    name: 'restore_saved',
    arguments: { kind: 'palette', number: 1 },
  });
  expect(nothing.isError).toBe(true);
  await w.close();
});
