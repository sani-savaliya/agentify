import { describe, expect, it } from "vitest";
import { loadSpec, resolveBaseUrl } from "./spec.js";
import { openapi3, swagger2 } from "./__fixtures__/specs.js";

describe("resolveBaseUrl", () => {
  it("uses the explicit override above everything else", () => {
    expect(resolveBaseUrl(openapi3, "https://override.test/")).toBe("https://override.test");
  });

  it("substitutes OpenAPI 3.x server variables with their defaults", () => {
    expect(resolveBaseUrl(openapi3)).toBe("https://api.petstore.example/v3");
  });

  it("builds the URL from Swagger 2.0 schemes/host/basePath", () => {
    expect(resolveBaseUrl(swagger2)).toBe("https://legacy.example.com/api");
  });

  it("defaults the scheme to https when 2.0 omits schemes", () => {
    expect(resolveBaseUrl({ host: "x.test" })).toBe("https://x.test");
  });

  it("returns an empty string when no server info exists", () => {
    expect(resolveBaseUrl({})).toBe("");
  });
});

describe("loadSpec", () => {
  it("dereferences $refs so downstream stages see inline schemas", async () => {
    const spec = await loadSpec(structuredClone(openapi3));
    const bodySchema = spec.paths["/pets/{petId}"].post.requestBody.content["application/json"].schema;
    expect(bodySchema.$ref).toBeUndefined();
    expect(bodySchema.properties.name.type).toBe("string");
  });
});
