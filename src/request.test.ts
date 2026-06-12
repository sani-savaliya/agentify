import { describe, expect, it } from "vitest";
import { buildRequest } from "./request.js";
import type { OperationInfo } from "./types.js";

const baseUrl = "https://api.test/v1";

const getPet: OperationInfo = {
  method: "GET",
  path: "/pets/{petId}",
  parameters: [
    { name: "petId", in: "path", required: true, schema: { type: "integer" } },
    { name: "verbose", in: "query", required: false, schema: { type: "boolean" } },
    { name: "X-Trace", in: "header", required: false, schema: { type: "string" } }
  ]
};

const listPets: OperationInfo = {
  method: "GET",
  path: "/pets",
  parameters: [{ name: "tags", in: "query", required: false, schema: { type: "array" } }]
};

const createPet: OperationInfo = {
  method: "POST",
  path: "/pets",
  parameters: [],
  requestBody: { required: true, contentType: "application/json", schema: { type: "object" } }
};

describe("buildRequest", () => {
  it("substitutes path parameters and url-encodes them", () => {
    const req = buildRequest(getPet, baseUrl, { petId: "a/b" });
    expect(req.url).toBe("https://api.test/v1/pets/a%2Fb");
    expect(req.method).toBe("GET");
  });

  it("appends query parameters", () => {
    const req = buildRequest(getPet, baseUrl, { petId: 7, verbose: true });
    expect(req.url).toBe("https://api.test/v1/pets/7?verbose=true");
  });

  it("routes header parameters into headers", () => {
    const req = buildRequest(getPet, baseUrl, { petId: 7, "X-Trace": "abc" });
    expect(req.headers["X-Trace"]).toBe("abc");
  });

  it("repeats array query parameters", () => {
    const req = buildRequest(listPets, baseUrl, { tags: ["a", "b"] });
    expect(req.url).toBe("https://api.test/v1/pets?tags=a&tags=b");
  });

  it("throws when a required path parameter is missing", () => {
    expect(() => buildRequest(getPet, baseUrl, {})).toThrow(/Missing required path parameter: petId/);
  });

  it("serializes the body and sets content-type", () => {
    const req = buildRequest(createPet, baseUrl, { body: { name: "Rex" } });
    expect(req.body).toBe('{"name":"Rex"}');
    expect(req.headers["content-type"]).toBe("application/json");
  });

  it("merges resolved auth headers and query", () => {
    const req = buildRequest(getPet, baseUrl, { petId: 1 }, { headers: { Authorization: "Bearer x" }, query: { apikey: "k" } });
    expect(req.headers.Authorization).toBe("Bearer x");
    expect(req.url).toContain("apikey=k");
  });

  it("works with an empty base url (relative path passthrough)", () => {
    const req = buildRequest(listPets, "", {});
    expect(req.url).toBe("/pets");
  });
});
