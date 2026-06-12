import type { RequestDescriptor } from "./types.js";

export interface ExecuteResult {
  status: number;
  ok: boolean;
  body: string;
  contentType: string | null;
}

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/** Maximum response body (chars) returned to the agent before truncation. */
const MAX_BODY_CHARS = 100_000;

/**
 * Executes a resolved request descriptor. The only impure stage in the pipeline;
 * `fetchImpl` is injectable so it can be stubbed in tests.
 */
export async function executeRequest(
  req: RequestDescriptor,
  fetchImpl: FetchLike = fetch
): Promise<ExecuteResult> {
  const init: RequestInit = {
    method: req.method,
    headers: req.headers
  };
  if (req.body !== undefined) init.body = req.body;

  const res = await fetchImpl(req.url, init);
  let body = await res.text();
  if (body.length > MAX_BODY_CHARS) {
    body = `${body.slice(0, MAX_BODY_CHARS)}\n\n... [truncated ${body.length - MAX_BODY_CHARS} chars]`;
  }

  return {
    status: res.status,
    ok: res.ok,
    body,
    contentType: res.headers.get("content-type")
  };
}
