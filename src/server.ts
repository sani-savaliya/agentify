import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { buildRequest } from "./request.js";
import { executeRequest } from "./execute.js";
import type { ResolvedAuth, ToolDef } from "./types.js";

export interface ServerConfig {
  tools: ToolDef[];
  baseUrl: string;
  auth: ResolvedAuth;
  name: string;
  version: string;
}

/**
 * Builds an MCP server that exposes one tool per OpenAPI operation. Each tool
 * call is translated into an HTTP request via the pure `buildRequest` pipeline
 * and executed against the API.
 */
export function createServer(config: ServerConfig): Server {
  const server = new Server(
    { name: config.name, version: config.version },
    { capabilities: { tools: {} } }
  );

  const byName = new Map(config.tools.map((t) => [t.name, t]));

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: config.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as { type: "object" }
    }))
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = byName.get(request.params.name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: `Unknown tool: ${request.params.name}` }]
      };
    }

    try {
      const descriptor = buildRequest(
        tool.operation,
        config.baseUrl,
        (request.params.arguments ?? {}) as Record<string, unknown>,
        config.auth
      );
      const result = await executeRequest(descriptor);
      return {
        isError: !result.ok,
        content: [
          {
            type: "text" as const,
            text: `HTTP ${result.status} — ${descriptor.method} ${descriptor.url}\n\n${result.body}`
          }
        ]
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { isError: true, content: [{ type: "text" as const, text: `Error: ${message}` }] };
    }
  });

  return server;
}

/** Boots the server over stdio. Never writes to stdout (that's the MCP channel). */
export async function startStdioServer(config: ServerConfig): Promise<void> {
  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `agentify: serving ${config.tools.length} tools from ${config.name} against ${config.baseUrl || "(no base url)"}`
  );
}
