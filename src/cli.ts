#!/usr/bin/env node
import { loadSpec, resolveBaseUrl } from "./spec.js";
import { extractOperations } from "./operations.js";
import { resolveAuth } from "./auth.js";
import { filterTools } from "./filter.js";
import { parseArgs } from "./args.js";
import { startStdioServer } from "./server.js";
import type { ToolDef } from "./types.js";

const USAGE = `agentify — turn any OpenAPI/Swagger spec into an MCP server.

Usage:
  agentify <spec-url-or-file> [options]

Options:
  --base-url <url>     Override the API base URL from the spec
  --header "K: V"      Add a raw header to every request (repeatable)
  --name <name>        Override the MCP server name
  --list               Print the discovered tools and exit (no server)
  -h, --help           Show this help

Tool selection (keep big APIs from flooding the agent's context):
  --tag <tag>          Keep only operations with this tag (repeatable)
  --exclude-tag <tag>  Drop operations with this tag (repeatable)
  --method <verb>      Keep only this HTTP method, e.g. GET (repeatable)
  --read-only          Shorthand: keep only GET/HEAD/OPTIONS operations
  --include <glob>     Keep only tools matching this glob (repeatable)
  --exclude <glob>     Drop tools matching this glob (repeatable)
  --max-tools <n>      Hard cap on tool count (warns when it truncates)
                       Globs match the operationId or "METHOD /path".

Auth (via environment variables):
  AGENTIFY_BEARER_TOKEN          Authorization: Bearer <token>
  AGENTIFY_BASIC_USER / _PASS    HTTP basic auth
  AGENTIFY_API_KEY               API key (header by default)
  AGENTIFY_API_KEY_HEADER        Override the api-key header name
  AGENTIFY_API_KEY_QUERY         Send the api key as this query param instead

Examples:
  agentify https://petstore3.swagger.io/api/v3/openapi.json --list
  agentify https://api.github.com/openapi.json --tag repos --read-only
  agentify ./stripe.json --include "*Customer*" --max-tools 25
  AGENTIFY_BEARER_TOKEN=xyz agentify ./openapi.yaml
`;

function printList(title: string, baseUrl: string, tools: ToolDef[], dropped: number): void {
  console.log(`${title}`);
  console.log(`Base URL: ${baseUrl || "(none)"}`);
  console.log(`Tools: ${tools.length}${dropped > 0 ? ` (${dropped} filtered out)` : ""}\n`);
  for (const tool of tools) {
    const firstLine = tool.description.split("\n")[0];
    const tags = tool.operation.tags?.length ? `  [${tool.operation.tags.join(", ")}]` : "";
    console.log(`  ${tool.name}${tags}`);
    console.log(`    ${firstLine}`);
  }
}

export async function run(argv: string[]): Promise<number> {
  const args = parseArgs(argv);

  if (args.help || !args.source) {
    console.log(USAGE);
    return args.source ? 0 : args.help ? 0 : 1;
  }

  const spec = await loadSpec(args.source);
  const allTools = extractOperations(spec);
  const { tools, dropped, truncated, capDropped } = filterTools(allTools, args.filter);
  const baseUrl = resolveBaseUrl(spec, args.baseUrl);
  const title = `${spec?.info?.title ?? "API"} v${spec?.info?.version ?? "0.0.0"}`;
  const name = args.name ?? spec?.info?.title ?? "agentify";

  if (truncated) {
    const matched = tools.length + capDropped;
    console.error(
      `agentify: --max-tools=${args.filter.maxTools} kept the first ${tools.length} of ${matched} matching operations ` +
        `(${capDropped} dropped by the cap). Narrow with --tag/--include/--method to choose which tools to keep.`
    );
  }

  if (args.list) {
    printList(title, baseUrl, tools, dropped);
    return 0;
  }

  const auth = resolveAuth(spec, process.env, args.headers);
  await startStdioServer({ tools, baseUrl, auth, name, version: spec?.info?.version ?? "0.0.0" });
  return 0;
}

run(process.argv.slice(2))
  .then((code) => {
    // A running stdio server keeps the process alive; --list/help return here.
    if (code !== 0) process.exitCode = code;
  })
  .catch((err) => {
    console.error(`agentify: ${err instanceof Error ? err.message : String(err)}`);
    // Force exit: a failed spec fetch can leave an open HTTP keep-alive handle
    // that otherwise keeps the process alive (hangs) instead of exiting. No
    // server is running on the error path, so exiting immediately is safe.
    process.exit(1);
  });
