import { describe, expect, it } from "vitest";
import { discoverApiKeyHeader, parseHeaderArg, resolveAuth } from "./auth.js";
import { openapi3, swagger2 } from "./__fixtures__/specs.js";

describe("resolveAuth", () => {
  it("builds a bearer Authorization header", () => {
    const auth = resolveAuth({}, { AGENTIFY_BEARER_TOKEN: "tok" });
    expect(auth.headers.Authorization).toBe("Bearer tok");
  });

  it("builds a basic Authorization header", () => {
    const auth = resolveAuth({}, { AGENTIFY_BASIC_USER: "u", AGENTIFY_BASIC_PASS: "p" });
    expect(auth.headers.Authorization).toBe(`Basic ${Buffer.from("u:p").toString("base64")}`);
  });

  it("places an api key in the spec-declared header by default", () => {
    const auth = resolveAuth(openapi3, { AGENTIFY_API_KEY: "k" });
    expect(auth.headers["X-Pet-Key"]).toBe("k");
  });

  it("places an api key in a query param when requested", () => {
    const auth = resolveAuth(openapi3, { AGENTIFY_API_KEY: "k", AGENTIFY_API_KEY_QUERY: "api_key" });
    expect(auth.query.api_key).toBe("k");
    expect(auth.headers["X-Pet-Key"]).toBeUndefined();
  });

  it("lets explicit --header values win over derived ones", () => {
    const auth = resolveAuth({}, { AGENTIFY_BEARER_TOKEN: "tok" }, { Authorization: "custom" });
    expect(auth.headers.Authorization).toBe("custom");
  });

  it("returns empty auth when no env vars are set", () => {
    const auth = resolveAuth({}, {});
    expect(auth).toEqual({ headers: {}, query: {} });
  });
});

describe("discoverApiKeyHeader", () => {
  it("finds the OpenAPI 3.x apiKey header name", () => {
    expect(discoverApiKeyHeader(openapi3)).toBe("X-Pet-Key");
  });

  it("finds the Swagger 2.0 apiKey header name", () => {
    expect(discoverApiKeyHeader(swagger2)).toBe("Api-Token");
  });

  it("returns undefined when no apiKey scheme exists", () => {
    expect(discoverApiKeyHeader({})).toBeUndefined();
  });
});

describe("parseHeaderArg", () => {
  it("splits on the first colon", () => {
    expect(parseHeaderArg("X-Key: a:b")).toEqual(["X-Key", "a:b"]);
  });

  it("returns null when there is no colon", () => {
    expect(parseHeaderArg("nope")).toBeNull();
  });
});
