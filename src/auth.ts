import type { ResolvedAuth } from "./types.js";

/**
 * Resolves authentication from environment variables (and the spec's declared
 * security schemes, used only to discover an API-key header name).
 *
 * Supported env vars (all optional, applied in this order):
 *   AGENTIFY_BEARER_TOKEN      -> Authorization: Bearer <token>
 *   AGENTIFY_BASIC_USER/PASS   -> Authorization: Basic <base64>
 *   AGENTIFY_API_KEY           -> API key, placed in a header (default) or query
 *   AGENTIFY_API_KEY_HEADER    -> override the api-key header name
 *   AGENTIFY_API_KEY_QUERY     -> put the api key in this query param instead
 *
 * Extra raw headers (e.g. from `--header "X: Y"`) are merged on top and win.
 */
export function resolveAuth(
  spec: any,
  env: Record<string, string | undefined> = process.env,
  extraHeaders: Record<string, string> = {}
): ResolvedAuth {
  const headers: Record<string, string> = {};
  const query: Record<string, string> = {};

  const bearer = env.AGENTIFY_BEARER_TOKEN;
  if (bearer) headers["Authorization"] = `Bearer ${bearer}`;

  const user = env.AGENTIFY_BASIC_USER;
  const pass = env.AGENTIFY_BASIC_PASS;
  if (user !== undefined && pass !== undefined) {
    const encoded = Buffer.from(`${user}:${pass}`).toString("base64");
    headers["Authorization"] = `Basic ${encoded}`;
  }

  const apiKey = env.AGENTIFY_API_KEY;
  if (apiKey) {
    const queryParam = env.AGENTIFY_API_KEY_QUERY;
    if (queryParam) {
      query[queryParam] = apiKey;
    } else {
      const headerName = env.AGENTIFY_API_KEY_HEADER || discoverApiKeyHeader(spec) || "X-API-Key";
      headers[headerName] = apiKey;
    }
  }

  Object.assign(headers, extraHeaders);
  return { headers, query };
}

/** Finds the first `apiKey`-in-header security scheme name declared by the spec. */
export function discoverApiKeyHeader(spec: any): string | undefined {
  const schemes = spec?.components?.securitySchemes ?? spec?.securityDefinitions;
  if (!schemes || typeof schemes !== "object") return undefined;
  for (const scheme of Object.values<any>(schemes)) {
    if (scheme?.type === "apiKey" && scheme.in === "header" && scheme.name) {
      return String(scheme.name);
    }
  }
  return undefined;
}

/** Parses a CLI `--header "Name: value"` string into a [name, value] pair. */
export function parseHeaderArg(raw: string): [string, string] | null {
  const idx = raw.indexOf(":");
  if (idx === -1) return null;
  const name = raw.slice(0, idx).trim();
  const value = raw.slice(idx + 1).trim();
  if (!name) return null;
  return [name, value];
}
