// End-to-end smoke test: boots the built agentify server over stdio against the
// live Swagger Petstore, then acts as a real MCP client — handshake, list tools,
// and call one tool against the live API. Not part of the published package.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const SPEC = "https://petstore3.swagger.io/api/v3/openapi.json";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["dist/cli.js", SPEC]
});

const client = new Client({ name: "smoke-test", version: "0.0.0" });
await client.connect(transport);

const { tools } = await client.listTools();
console.log(`[smoke] connected; server exposed ${tools.length} tools`);

const callResult = await client.callTool({
  name: "findPetsByStatus",
  arguments: { status: "available" }
});

const text = callResult.content?.[0]?.text ?? "";
console.log(`[smoke] findPetsByStatus(status=available) ->`);
console.log(text.split("\n").slice(0, 3).join("\n"));
console.log(`[smoke] isError: ${callResult.isError === true}`);

await client.close();

// Tool filtering: --tag must narrow the exposed tool set.
const filtered = new StdioClientTransport({
  command: process.execPath,
  args: ["dist/cli.js", SPEC, "--tag", "store"]
});
const fclient = new Client({ name: "smoke-filter", version: "0.0.0" });
await fclient.connect(filtered);
const { tools: storeTools } = await fclient.listTools();
await fclient.close();
if (storeTools.length === 0 || storeTools.length >= tools.length) {
  throw new Error(`[smoke] --tag store did not filter (got ${storeTools.length} of ${tools.length})`);
}
console.log(`[smoke] --tag store narrowed ${tools.length} → ${storeTools.length} tools`);

// Regression: a bad/unreachable spec URL must exit promptly (non-zero), not
// hang on a lingering HTTP keep-alive handle.
import { spawn } from "node:child_process";
const badUrlExit = await new Promise((resolve) => {
  const child = spawn(process.execPath, ["dist/cli.js", "https://nope.invalid/openapi.json", "--list"], { stdio: "ignore" });
  const timer = setTimeout(() => { child.kill(); resolve("HANG"); }, 10_000);
  child.on("exit", (code) => { clearTimeout(timer); resolve(code); });
});
if (badUrlExit === "HANG" || badUrlExit === 0) {
  throw new Error(`[smoke] bad-URL did not exit cleanly (got ${badUrlExit}) — regression of the hang bug`);
}
console.log(`[smoke] bad-URL exits promptly with code ${badUrlExit}`);

console.log("[smoke] OK");
