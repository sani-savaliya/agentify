#!/usr/bin/env node
import { loadSpec, resolveBaseUrl } from "./spec.js";
import { extractOperations } from "./operations.js";
import { parseHeaderArg, resolveAuth } from "./auth.js";
import { startStdioServer } from "./server.js";
import type { ToolDef } from "./types.js";

interface CliArgs {
  source?: string;
  baseUrl?: string;
  headers: Record<string, string>;
  name?: string;
  list: boolean;
  help: boolean;
}

const USAGE = `agentify — turn any OpenAPI/Swagger spec into an MCP server.

Usage:
  agentify <spec-url-or-file> [options]

Options:
  --base-url <url>     Override the API base URL from the spec
  --header "K: V"      Add a raw header to every request (repeatable)
  --name <name>        Override the MCP server name
  --list               Print the discovered tools and exit (no server)
  -h, --help           Show this help

Auth (via environment variables):
  AGENTIFY_BEARER_TOKEN          Authorization: Bearer <token>
  AGENTIFY_BASIC_USER / _PASS    HTTP basic auth
  AGENTIFY_API_KEY               API key (header by default)
  AGENTIFY_API_KEY_HEADER        Override the api-key header name
  AGENTIFY_API_KEY_QUERY         Send the api key as this query param instead

Examples:
  agentify https://petstore3.swagger.io/api/v3/openapi.json --list
  AGENTIFY_BEARER_TOKEN=xyz agentify ./openapi.yaml
`;

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { headers: {}, list: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "--list":
        args.list = true;
        break;
      case "--base-url":
        args.baseUrl = argv[++i];
        break;
      case "--name":
        args.name = argv[++i];
        break;
      case "--header": {
        const parsed = parseHeaderArg(argv[++i] ?? "");
        if (parsed) args.headers[parsed[0]] = parsed[1];
        break;
      }
      default:
        if (!arg.startsWith("-") && args.source === undefined) args.source = arg;
    }
  }
  return args;
}

function printList(title: string, baseUrl: string, tools: ToolDef[]): void {
  console.log(`${title}`);
  console.log(`Base URL: ${baseUrl || "(none)"}`);
  console.log(`Tools: ${tools.length}\n`);
  for (const tool of tools) {
    const firstLine = tool.description.split("\n")[0];
    console.log(`  ${tool.name}`);
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
  const tools = extractOperations(spec);
  const baseUrl = resolveBaseUrl(spec, args.baseUrl);
  const title = `${spec?.info?.title ?? "API"} v${spec?.info?.version ?? "0.0.0"}`;
  const name = args.name ?? spec?.info?.title ?? "agentify";

  if (args.list) {
    printList(title, baseUrl, tools);
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
    process.exitCode = 1;
  });
