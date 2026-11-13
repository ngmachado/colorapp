import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { expect, test } from '@playwright/test';

/** A key made on the account page, as a person would. */
async function makeKey(page: import('@playwright/test').Page, name: string) {
  await page.goto(`/api/test/login?email=mcp-${test.info().project.name}@example.com`);
  await page.goto('/account');
  await page.getByLabel('Name of the new key').fill(name);
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
    'contrast_pair',
    'find_records',
    'inspect_colour',
    'lookup_record',
    'request_palette',
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

  const resources = (await client.listResources()).resources;
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
