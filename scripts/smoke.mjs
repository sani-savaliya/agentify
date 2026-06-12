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
console.log("[smoke] OK");
