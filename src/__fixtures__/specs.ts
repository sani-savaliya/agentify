/** Minimal but representative specs used across the test suite. */

/** OpenAPI 3.x with a $ref, server variables, path+op params, and a request body. */
export const openapi3: any = {
  openapi: "3.0.0",
  info: { title: "Pet API", version: "1.0.0" },
  servers: [
    {
      url: "https://{host}/v3",
      variables: { host: { default: "api.petstore.example" } }
    }
  ],
  components: {
    securitySchemes: {
      apiKey: { type: "apiKey", in: "header", name: "X-Pet-Key" }
    },
    schemas: {
      Pet: {
        type: "object",
        properties: { id: { type: "integer" }, name: { type: "string" } },
        required: ["name"]
      }
    }
  },
  paths: {
    "/pets/{petId}": {
      parameters: [
        { name: "petId", in: "path", required: true, schema: { type: "integer" } }
      ],
      get: {
        operationId: "getPet",
        summary: "Get a pet by id",
        parameters: [{ name: "verbose", in: "query", schema: { type: "boolean" } }],
        responses: { "200": { description: "ok" } }
      },
      post: {
        operationId: "updatePet",
        summary: "Update a pet",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/Pet" } } }
        },
        responses: { "200": { description: "ok" } }
      }
    },
    "/pets": {
      get: {
        // no operationId on purpose -> name derived from method+path
        summary: "List pets",
        parameters: [{ name: "tags", in: "query", schema: { type: "array", items: { type: "string" } } }],
        responses: { "200": { description: "ok" } }
      }
    }
  }
};

/** Swagger 2.0 with host/basePath/schemes and a 2.0-style body parameter. */
export const swagger2: any = {
  swagger: "2.0",
  info: { title: "Legacy API", version: "1.0.0" },
  host: "legacy.example.com",
  basePath: "/api",
  schemes: ["https"],
  securityDefinitions: {
    key: { type: "apiKey", in: "header", name: "Api-Token" }
  },
  paths: {
    "/widgets": {
      post: {
        operationId: "createWidget",
        summary: "Create a widget",
        parameters: [
          { name: "dryRun", in: "query", type: "boolean" },
          {
            name: "body",
            in: "body",
            required: true,
            schema: { type: "object", properties: { name: { type: "string" } } }
          }
        ],
        responses: { "200": { description: "ok" } }
      }
    }
  }
};
