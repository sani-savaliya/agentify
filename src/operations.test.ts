import { describe, expect, it } from "vitest";
import { loadSpec } from "./spec.js";
import {
  buildDescription,
  extractOperations,
  sanitizeName,
  toolName
} from "./operations.js";
import { openapi3, swagger2 } from "./__fixtures__/specs.js";

describe("sanitizeName", () => {
  it("replaces invalid characters and collapses underscores", () => {
    expect(sanitizeName("get /pets/{petId}")).toBe("get_pets_petId");
  });

  it("falls back to 'op' for empty input", () => {
    expect(sanitizeName("///")).toBe("op");
  });

  it("caps length at 64 characters", () => {
    expect(sanitizeName("a".repeat(200)).length).toBe(64);
  });
});

describe("toolName", () => {
  it("prefers operationId", () => {
    expect(toolName({ operationId: "getPet" }, "get", "/pets/{id}")).toBe("getPet");
  });

  it("derives from method+path when operationId is absent", () => {
    expect(toolName({}, "get", "/pets")).toBe("get_pets");
  });
});

describe("buildDescription", () => {
  it("includes the raw method and path", () => {
    expect(buildDescription({ summary: "List" }, "get", "/pets")).toContain("[GET /pets]");
  });
});

describe("extractOperations", () => {
  it("produces one tool per operation", async () => {
    const spec = await loadSpec(structuredClone(openapi3));
    const tools = extractOperations(spec);
    expect(tools.map((t) => t.name).sort()).toEqual(["getPet", "get_pets", "updatePet"]);
  });

  it("captures operation tags (coercing non-string entries) and defaults to []", async () => {
    const spec = await loadSpec({
      openapi: "3.0.0",
      info: { title: "T", version: "1" },
      paths: {
        "/tagged": { get: { operationId: "tagged", tags: ["pets", 123], responses: {} } },
        "/untagged": { get: { operationId: "untagged", responses: {} } }
      }
    });
    const tools = extractOperations(spec);
    const tagged = tools.find((t) => t.name === "tagged")!;
    const untagged = tools.find((t) => t.name === "untagged")!;
    expect(tagged.operation.tags).toEqual(["pets", "123"]);
    expect(untagged.operation.tags).toEqual([]);
  });

  it("merges path-level parameters into each operation", async () => {
    const spec = await loadSpec(structuredClone(openapi3));
    const getPet = extractOperations(spec).find((t) => t.name === "getPet")!;
    const names = getPet.operation.parameters.map((p) => p.name);
    expect(names).toContain("petId"); // path-level
    expect(names).toContain("verbose"); // operation-level
  });

  it("marks path parameters as required even if the spec omits it", async () => {
    const spec = await loadSpec(structuredClone(openapi3));
    const getPet = extractOperations(spec).find((t) => t.name === "getPet")!;
    const petId = getPet.operation.parameters.find((p) => p.name === "petId")!;
    expect(petId.required).toBe(true);
  });

  it("captures the request body from an OpenAPI 3.x operation", async () => {
    const spec = await loadSpec(structuredClone(openapi3));
    const updatePet = extractOperations(spec).find((t) => t.name === "updatePet")!;
    expect(updatePet.operation.requestBody?.required).toBe(true);
    expect(updatePet.operation.requestBody?.contentType).toBe("application/json");
  });

  it("treats a Swagger 2.0 body parameter as a request body", async () => {
    const spec = await loadSpec(structuredClone(swagger2));
    const create = extractOperations(spec).find((t) => t.name === "createWidget")!;
    expect(create.operation.requestBody?.required).toBe(true);
    // the body param must NOT leak into the parameter list
    expect(create.operation.parameters.map((p) => p.name)).not.toContain("body");
    expect(create.operation.parameters.map((p) => p.name)).toContain("dryRun");
  });
});
