import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { requireKey } from '@/lib/api-auth';
import { mcpServer } from '@/lib/mcp/server';

export const dynamic = 'force-dynamic';

/**
 * The MCP server over streamable HTTP, stateless: each POST carries one JSON-RPC message, is checked
 * against the bearer API key (which counts it), is answered by a fresh server, and keeps nothing.
 * The tools read the records and measure colours; none writes anything.
 */
export async function POST(req: Request) {
  const who = await requireKey(req);
  if (who instanceof Response) return who;
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = mcpServer();
  await server.connect(transport);
  try {
    return await transport.handleRequest(req, {
      authInfo: { token: who.keyId, clientId: who.keyName, scopes: ['read'] },
    });
  } finally {
    await server.close().catch(() => undefined);
  }
}

const notAllowed = () =>
  Response.json(
    { error: 'The MCP server takes POST requests only; there are no sessions to open or close.' },
    { status: 405, headers: { allow: 'POST' } },
  );

export const GET = notAllowed;
export const DELETE = notAllowed;
