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

## Use it with Claude / any MCP client

Add to your MCP client config (e.g. Claude Desktop / Claude Code):

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

## Limitations (v0.1)

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
