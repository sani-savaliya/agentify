# agentify

**Turn any OpenAPI / Swagger spec into an agent-ready MCP server.**

[![npm](https://img.shields.io/npm/v/agentify-openapi)](https://www.npmjs.com/package/agentify-openapi)
Listed on the [official MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.sani-savaliya/agentify) (`io.github.sani-savaliya/agentify`) and [Smithery](https://smithery.ai/servers/sanisavaliya12/agentify).

Point it at a spec — a URL, a file, OpenAPI 3.x or Swagger 2.0 — and every operation
becomes a tool an AI agent can call. No code generation, no per-API boilerplate, no
hosting. One command.

```bash
npx agentify-openapi https://petstore3.swagger.io/api/v3/openapi.json --list
```

```
Swagger Petstore - OpenAPI 3.0 v1.0.27
Base URL: https://petstore3.swagger.io/api/v3
Tools: 19

  getPetById
    Find pet by ID.
  findPetsByStatus
    Finds Pets by status.
  ...
```

## Why

> *"Today, agents have to operate software designed for humans. The interfaces of
> the future will be built for agents — APIs, MCPs, CLIs — with agents as
> first-class citizens."* — [YC RFS: Software for Agents](https://www.ycombinator.com/rfs)

There are tens of thousands of APIs that already describe themselves with an OpenAPI
document. `agentify` makes every one of them agent-native, instantly, without anyone
hand-writing an integration.

## Use it with Claude, Cursor, Windsurf — any MCP client

Add it to your client's MCP config. The same `command`/`args` shape works in
**Claude Desktop**, **Claude Code** (`claude mcp add`), **Cursor**
(`.cursor/mcp.json`), **Windsurf**, **Cline**, and anything else that speaks MCP:

```json
{
  "mcpServers": {
    "petstore": {
      "command": "npx",
      "args": ["-y", "agentify-openapi", "https://petstore3.swagger.io/api/v3/openapi.json"]
    }
  }
}
```

The agent now has one tool per API operation. Calling a tool builds the HTTP request
(path params, query string, headers, JSON body) and returns the live response.

## Big API? Pick just the tools you need

Pointing at GitHub (1000+ operations) or Stripe (400+) would flood your agent with
hundreds of tools and wreck its tool-selection accuracy. Filter down to what matters —
by tag, HTTP method, or name glob — and cap the total:

```bash
# GitHub, read-only, just the repo endpoints
npx agentify-openapi https://api.github.com/openapi.json --tag repos --read-only

# Stripe customer endpoints only, hard cap at 25 tools
npx agentify-openapi ./stripe.json --include "*Customer*" --max-tools 25
```

```json
{
  "mcpServers": {
    "github-repos": {
      "command": "npx",
      "args": ["-y", "agentify-openapi", "https://api.github.com/openapi.json",
               "--tag", "repos", "--read-only", "--max-tools", "30"],
      "env": { "AGENTIFY_BEARER_TOKEN": "ghp_your_token" }
    }
  }
}
```

`--read-only` (GET/HEAD/OPTIONS) is also a simple safety rail — expose a giant API to
an agent without exposing anything that can mutate state.

## Auth

Provide credentials via environment variables — `agentify` reads the spec's declared
security scheme to find the right header name when it can:

| Variable | Effect |
|---|---|
| `AGENTIFY_BEARER_TOKEN` | `Authorization: Bearer <token>` |
| `AGENTIFY_BASIC_USER` / `AGENTIFY_BASIC_PASS` | HTTP basic auth |
| `AGENTIFY_API_KEY` | API key (sent as a header by default) |
| `AGENTIFY_API_KEY_HEADER` | Override the api-key header name |
| `AGENTIFY_API_KEY_QUERY` | Send the api key as a query param instead |

You can also inject raw headers from the CLI: `--header "X-Org-Id: 42"` (repeatable).

## CLI

```
agentify <spec-url-or-file> [options]

  --base-url <url>     Override the API base URL from the spec
  --header "K: V"      Add a raw header to every request (repeatable)
  --name <name>        Override the MCP server name
  --list               Print the discovered tools and exit (no server)
  -h, --help           Show help

  Tool selection (keep big APIs from flooding the agent's context):
  --tag <tag>          Keep only operations with this tag (repeatable)
  --exclude-tag <tag>  Drop operations with this tag (repeatable)
  --method <verb>      Keep only this HTTP method, e.g. GET (repeatable)
  --read-only          Shorthand: keep only GET/HEAD/OPTIONS operations
  --include <glob>     Keep only tools matching this glob (repeatable)
  --exclude <glob>     Drop tools matching this glob (repeatable)
  --max-tools <n>      Hard cap on tool count (warns when it truncates)
```

## How it works

A small, pure pipeline — each stage is independently unit-tested:

```
spec ──▶ operations ──▶ tool defs ──▶ http request ──▶ response
 │           │              │              │              │
load &    one tool       JSON Schema   path/query/    fetch + surface
deref     per op         for inputs    header/body    status & body
$refs                                  + auth
```

Only the HTTP execution and MCP transport touch the outside world; everything else is
deterministic and tested.

## Programmatic use

```ts
import { loadSpec, extractOperations, resolveBaseUrl, createServer } from "agentify-openapi";

const spec = await loadSpec("./openapi.yaml");
const tools = extractOperations(spec);
const baseUrl = resolveBaseUrl(spec);
// ...build your own MCP server, or just inspect the generated tool defs
```

## Limitations

- JSON request/response bodies are first-class; `multipart`/form bodies are passed
  through best-effort.
- `cookie` parameters and OAuth2 flows are not yet handled (use `--header` for now).
- One server per spec. Multi-spec aggregation is on the roadmap.

## Development

```bash
npm install
npm test          # vitest, 80%+ coverage enforced
npm run build     # tsc -> dist/
node scripts/smoke.mjs   # end-to-end MCP client smoke test (network)
```

## License

MIT
