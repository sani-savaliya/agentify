import { describe, expect, it } from "vitest";
import { buildInputSchema } from "./schema.js";
import type { OperationInfo } from "./types.js";

const op: OperationInfo = {
  method: "POST",
  path: "/pets/{petId}",
  parameters: [
    { name: "petId", in: "path", required: true, schema: { type: "integer" }, description: "id" },
    { name: "verbose", in: "query", required: false, schema: { type: "boolean" } }
  ],
  requestBody: {
    required: true,
    contentType: "application/json",
    schema: { type: "object", properties: { name: { type: "string" } } }
  }
};

describe("buildInputSchema", () => {
  const schema = buildInputSchema(op);

  it("creates a top-level property per parameter", () => {
    expect(Object.keys(schema.properties as object)).toEqual(["petId", "verbose", "body"]);
  });

  it("carries parameter descriptions into the property", () => {
    expect((schema.properties as any).petId.description).toBe("id");
  });

  it("lists required params and body under required", () => {
    expect(schema.required).toEqual(["petId", "body"]);
  });

  it("nests the request body under the 'body' property", () => {
    expect((schema.properties as any).body.properties.name.type).toBe("string");
  });

  it("omits 'required' entirely when nothing is required", () => {
    const optional = buildInputSchema({ method: "GET", path: "/x", parameters: [] });
    expect(optional.required).toBeUndefined();
  });
});
