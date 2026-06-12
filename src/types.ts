/**
 * Shared types for the OpenAPI -> MCP conversion pipeline.
 *
 * The pipeline is intentionally split into small, pure stages:
 *   spec  -> operations -> tool definitions -> http request -> response
 * Only `execute` and the MCP server wiring touch the outside world; everything
 * else is pure and unit-tested.
 */

/** A loosely-typed JSON Schema fragment (we pass these straight to MCP clients). */
export type JsonSchema = Record<string, unknown>;

/** Where a parameter is carried in the HTTP request. */
export type ParamLocation = "path" | "query" | "header" | "cookie";

export interface ParamInfo {
  name: string;
  in: ParamLocation;
  required: boolean;
  schema: JsonSchema;
  description?: string;
}

export interface RequestBodyInfo {
  required: boolean;
  contentType: string;
  schema: JsonSchema;
}

/** Everything needed to turn agent-supplied arguments into an HTTP call. */
export interface OperationInfo {
  method: string; // upper-case: GET, POST, ...
  path: string; // template, e.g. /pets/{petId}
  parameters: ParamInfo[];
  requestBody?: RequestBodyInfo;
}

/** A single MCP tool derived from one OpenAPI operation. */
export interface ToolDef {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  operation: OperationInfo;
}

/** Resolved authentication to merge into every outgoing request. */
export interface ResolvedAuth {
  headers: Record<string, string>;
  query: Record<string, string>;
}

/** A fully-resolved HTTP request, ready to hand to fetch(). */
export interface RequestDescriptor {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}
