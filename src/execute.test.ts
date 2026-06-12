import { describe, expect, it } from "vitest";
import { executeRequest } from "./execute.js";
import type { RequestDescriptor } from "./types.js";

function stubFetch(status: number, body: string, contentType = "application/json") {
  return async (_url: string, _init: RequestInit): Promise<Response> =>
    new Response(body, { status, headers: { "content-type": contentType } });
}

const req: RequestDescriptor = { method: "GET", url: "https://x.test/y", headers: {} };

describe("executeRequest", () => {
  it("returns status, ok and body for a 2xx response", async () => {
    const result = await executeRequest(req, stubFetch(200, '{"a":1}'));
    expect(result.status).toBe(200);
    expect(result.ok).toBe(true);
    expect(result.body).toBe('{"a":1}');
    expect(result.contentType).toBe("application/json");
  });

  it("marks non-2xx as not ok", async () => {
    const result = await executeRequest(req, stubFetch(404, "nope"));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
  });

  it("truncates very large response bodies", async () => {
    const huge = "x".repeat(250_000);
    const result = await executeRequest(req, stubFetch(200, huge));
    expect(result.body).toContain("[truncated");
    expect(result.body.length).toBeLessThan(huge.length);
    expect(result.body.startsWith("x".repeat(100_000))).toBe(true);
  });

  it("passes the body through to fetch for write methods", async () => {
    let seen: RequestInit | undefined;
    const spy = async (_url: string, init: RequestInit): Promise<Response> => {
      seen = init;
      return new Response("{}", { status: 201, headers: { "content-type": "application/json" } });
    };
    await executeRequest({ method: "POST", url: "https://x.test", headers: {}, body: '{"n":1}' }, spy);
    expect(seen?.body).toBe('{"n":1}');
    expect(seen?.method).toBe("POST");
  });
});
