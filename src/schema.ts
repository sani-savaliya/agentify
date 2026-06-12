import type { JsonSchema, OperationInfo } from "./types.js";

/**
 * Builds the MCP `inputSchema` (a JSON Schema object) that an agent fills in
 * when calling the tool.
 *
 * Layout: every path/query/header parameter becomes a top-level property keyed
 * by its name; the request body (if any) goes under a `body` property. This
 * flat shape is easy for models to populate and easy for `buildRequest` to
 * route back to the right place in the HTTP call.
 */
export function buildInputSchema(op: OperationInfo): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const param of op.parameters) {
    const base = param.schema ?? { type: "string" };
    properties[param.name] = param.description
      ? { ...base, description: param.description }
      : { ...base };
    if (param.required) required.push(param.name);
  }

  if (op.requestBody) {
    properties.body = op.requestBody.schema ?? { type: "object" };
    if (op.requestBody.required) required.push("body");
  }

  const schema: JsonSchema = {
    type: "object",
    properties
  };
  if (required.length > 0) schema.required = required;
  return schema;
}
