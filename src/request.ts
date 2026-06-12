import type { OperationInfo, RequestDescriptor, ResolvedAuth } from "./types.js";

const EMPTY_AUTH: ResolvedAuth = { headers: {}, query: {} };

function joinUrl(baseUrl: string, path: string): string {
  if (!baseUrl) return path;
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const tail = path.startsWith("/") ? path : `/${path}`;
  return base + tail;
}

function appendQuery(query: URLSearchParams, name: string, value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) query.append(name, String(item));
  } else if (value !== null && typeof value === "object") {
    query.append(name, JSON.stringify(value));
  } else {
    query.append(name, String(value));
  }
}

/**
 * Turns agent-supplied `args` into a concrete HTTP request for `operation`.
 *
 * Pure and synchronous — no network. Path params are substituted into the URL
 * template, query/header params routed to their slots, and `args.body`
 * serialized as JSON when the operation declares a request body. Resolved auth
 * headers/query are merged in last.
 *
 * Throws if a required path parameter is missing (the URL would be malformed).
 */
export function buildRequest(
  operation: OperationInfo,
  baseUrl: string,
  args: Record<string, unknown>,
  auth: ResolvedAuth = EMPTY_AUTH
): RequestDescriptor {
  let path = operation.path;
  const query = new URLSearchParams();
  const headers: Record<string, string> = { ...auth.headers };

  for (const param of operation.parameters) {
    const value = args[param.name];
    if (value === undefined || value === null) {
      if (param.required && param.in === "path") {
        throw new Error(`Missing required path parameter: ${param.name}`);
      }
      continue;
    }

    if (param.in === "path") {
      path = path.split(`{${param.name}}`).join(encodeURIComponent(String(value)));
    } else if (param.in === "query") {
      appendQuery(query, param.name, value);
    } else if (param.in === "header") {
      headers[param.name] = String(value);
    }
    // cookie params are intentionally unsupported in the MVP
  }

  for (const [key, value] of Object.entries(auth.query)) {
    query.set(key, value);
  }

  let url = joinUrl(baseUrl, path);
  const qs = query.toString();
  if (qs) url += (url.includes("?") ? "&" : "?") + qs;

  let body: string | undefined;
  if (operation.requestBody && args.body !== undefined) {
    const contentType = operation.requestBody.contentType || "application/json";
    if (!hasHeader(headers, "content-type")) {
      headers["content-type"] = contentType;
    }
    body = typeof args.body === "string" ? args.body : JSON.stringify(args.body);
  }

  return { method: operation.method, url, headers, body };
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  const lower = name.toLowerCase();
  return Object.keys(headers).some((k) => k.toLowerCase() === lower);
}
