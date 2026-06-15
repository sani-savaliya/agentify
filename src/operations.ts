import { buildInputSchema } from "./schema.js";
import type { JsonSchema, OperationInfo, ParamInfo, RequestBodyInfo, ToolDef } from "./types.js";

const HTTP_METHODS = ["get", "put", "post", "delete", "patch", "head", "options"] as const;

const MAX_NAME_LENGTH = 64;

/** Sanitizes an arbitrary string into a valid MCP tool name fragment. */
export function sanitizeName(raw: string): string {
  const cleaned = raw
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned.slice(0, MAX_NAME_LENGTH) || "op";
}

/** Derives a stable tool name, preferring operationId then `method_path`. */
export function toolName(op: any, method: string, path: string): string {
  if (op?.operationId) return sanitizeName(op.operationId);
  return sanitizeName(`${method}_${path}`);
}

function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  let i = 2;
  while (used.has(`${name}_${i}`)) i++;
  const result = `${name}_${i}`;
  used.add(result);
  return result;
}

/** Combines summary/description and always appends the raw METHOD + path. */
export function buildDescription(op: any, method: string, path: string): string {
  const parts: string[] = [];
  if (op?.summary) parts.push(String(op.summary).trim());
  if (op?.description && op.description !== op.summary) parts.push(String(op.description).trim());
  parts.push(`[${method.toUpperCase()} ${path}]`);
  return parts.join("\n\n");
}

/** Normalizes an OpenAPI 3.x or Swagger 2.0 parameter into ParamInfo. */
function normalizeParam(raw: any): ParamInfo | null {
  if (!raw || !raw.name || !raw.in) return null;
  // Swagger 2.0 body parameters are modeled as a request body, not a param.
  if (raw.in === "body") return null;

  let schema: JsonSchema;
  if (raw.schema) {
    schema = raw.schema as JsonSchema;
  } else {
    // Swagger 2.0 puts type info directly on the parameter.
    schema = {};
    for (const key of ["type", "format", "items", "enum", "default", "minimum", "maximum"]) {
      if (raw[key] !== undefined) (schema as any)[key] = raw[key];
    }
    if (!schema.type) schema.type = "string";
  }

  return {
    name: String(raw.name),
    in: raw.in,
    required: raw.in === "path" ? true : Boolean(raw.required),
    schema,
    description: raw.description
  };
}

/** Extracts the request body from either a 3.x `requestBody` or a 2.0 body param. */
function normalizeRequestBody(op: any): RequestBodyInfo | undefined {
  // OpenAPI 3.x
  if (op?.requestBody?.content) {
    const content = op.requestBody.content;
    const contentType = content["application/json"]
      ? "application/json"
      : Object.keys(content)[0] ?? "application/json";
    return {
      required: Boolean(op.requestBody.required),
      contentType,
      schema: (content[contentType]?.schema as JsonSchema) ?? { type: "object" }
    };
  }
  // Swagger 2.0 body parameter
  const bodyParam = Array.isArray(op?.parameters)
    ? op.parameters.find((p: any) => p?.in === "body")
    : undefined;
  if (bodyParam) {
    return {
      required: Boolean(bodyParam.required),
      contentType: "application/json",
      schema: (bodyParam.schema as JsonSchema) ?? { type: "object" }
    };
  }
  return undefined;
}

/**
 * Walks a dereferenced spec and produces one ToolDef per operation.
 * Path-level parameters are merged into every operation under that path.
 */
export function extractOperations(spec: any): ToolDef[] {
  const tools: ToolDef[] = [];
  const used = new Set<string>();
  const paths = spec?.paths ?? {};

  for (const [path, pathItem] of Object.entries<any>(paths)) {
    if (!pathItem) continue;
    const pathParams: any[] = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];

    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (!op || typeof op !== "object") continue;

      const opParams: any[] = Array.isArray(op.parameters) ? op.parameters : [];
      const parameters = [...pathParams, ...opParams]
        .map(normalizeParam)
        .filter((p): p is ParamInfo => p !== null);

      const requestBody = normalizeRequestBody(op);

      const tags = Array.isArray(op.tags) ? op.tags.map(String) : [];

      const operation: OperationInfo = {
        method: method.toUpperCase(),
        path,
        parameters,
        requestBody,
        tags
      };

      tools.push({
        name: uniqueName(toolName(op, method, path), used),
        description: buildDescription(op, method, path),
        inputSchema: buildInputSchema(operation),
        operation
      });
    }
  }

  return tools;
}
