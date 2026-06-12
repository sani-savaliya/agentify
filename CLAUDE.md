# agentify — project notes for Claude

Universal **OpenAPI/Swagger → MCP server**. Point it at a spec; every operation
becomes an agent tool. Dynamic runtime (no code generation). Targets YC RFS
"Software for Agents".

## Build & Test
- `npm test` — vitest, **80% coverage enforced** (see `vitest.config.ts` thresholds)
- `npm run build` — `tsc` → `dist/` (ESM, NodeNext; relative imports use `.js`)
- `npm run dev -- <spec> --list` — run from source via tsx
- `node scripts/smoke.mjs` — end-to-end MCP client smoke test (hits the network)

## Architecture (pure pipeline, one stage per file)
- `src/spec.ts` — load + dereference spec (`@apidevtools/swagger-parser`), resolve base URL
- `src/operations.ts` — walk paths → `ToolDef[]` (names, descriptions, param/body normalization; handles 3.x + 2.0)
- `src/schema.ts` — build MCP `inputSchema` (params as top-level props, body under `body`)
- `src/request.ts` — **pure** args → `RequestDescriptor` (path/query/header/body + auth merge)
- `src/auth.ts` — env vars → `ResolvedAuth`; discovers api-key header from securitySchemes
- `src/execute.ts` — the only impure stage; `fetch` (injectable), truncates >100k bodies
- `src/server.ts` — MCP `Server` wiring (stdio); excluded from coverage (smoke-tested)
- `src/cli.ts` — arg parsing, `--list`, server boot; entry/bin

## Key constraints
- Built for **MCP SDK v1.29** low-level `Server` + `setRequestHandler`. Import paths:
  `@modelcontextprotocol/sdk/server/index.js`, `.../server/stdio.js`, `.../types.js`.
- **stdio is the protocol channel** — never `console.log` in server mode; logs go to stderr.
- Coverage excludes `cli.ts`, `server.ts`, `index.ts`, `__fixtures__` (wiring/types).
- Package name on npm: `agentify-openapi` (the bin is `agentify`).

## Conventions
- Immutable, small files, explicit error handling (workspace `../CLAUDE.md`).
- Pure logic stays pure and unit-tested; side effects isolated to `execute`/`server`.

## Roadmap
- multipart/form bodies, cookie params, OAuth2 flows
- multi-spec aggregation into one server
- response schema hints surfaced to the agent
- publish to npm + MCP registry
