import { describe, it, expect } from "vitest";
import { filterTools, type FilterOptions } from "./filter.js";
import type { ToolDef } from "./types.js";

function tool(name: string, method: string, path: string, tags: string[] = []): ToolDef {
  return {
    name,
    description: `${name}\n\n[${method} ${path}]`,
    inputSchema: { type: "object" },
    operation: { method, path, parameters: [], tags }
  };
}

const tools: ToolDef[] = [
  tool("listPets", "GET", "/pets", ["pets"]),
  tool("getPet", "GET", "/pets/{id}", ["pets"]),
  tool("createPet", "POST", "/pets", ["pets"]),
  tool("deletePet", "DELETE", "/pets/{id}", ["pets"]),
  tool("listOrders", "GET", "/orders", ["orders"]),
  tool("createOrder", "POST", "/orders", ["orders"]),
  tool("health", "GET", "/health", [])
];

const run = (opts: FilterOptions) => filterTools(tools, opts);
const names = (opts: FilterOptions) => run(opts).tools.map((t) => t.name);

describe("filterTools", () => {
  it("returns everything when no options are given", () => {
    const { tools: out, dropped } = run({});
    expect(out).toHaveLength(tools.length);
    expect(dropped).toBe(0);
  });

  it("includes only operations with a given tag", () => {
    expect(names({ tags: ["orders"] })).toEqual(["listOrders", "createOrder"]);
  });

  it("supports multiple include tags (union)", () => {
    expect(names({ tags: ["orders", "pets"] }).sort()).toEqual(
      ["createOrder", "createPet", "deletePet", "getPet", "listOrders", "listPets"].sort()
    );
  });

  it("excludes operations with an excluded tag", () => {
    expect(names({ excludeTags: ["pets"] })).toEqual(["listOrders", "createOrder", "health"]);
  });

  it("filters by HTTP method (case-insensitive)", () => {
    expect(names({ methods: ["get"] })).toEqual(["listPets", "getPet", "listOrders", "health"]);
  });

  it("read-only keeps only safe methods", () => {
    expect(names({ readOnly: true })).toEqual(["listPets", "getPet", "listOrders", "health"]);
  });

  it("include globs match operationId", () => {
    expect(names({ include: ["*Pet"] })).toEqual(["getPet", "createPet", "deletePet"]);
  });

  it("include globs match METHOD path", () => {
    expect(names({ include: ["GET /pets*"] })).toEqual(["listPets", "getPet"]);
  });

  it("exclude globs remove matches", () => {
    expect(names({ exclude: ["delete*", "create*"] })).toEqual([
      "listPets",
      "getPet",
      "listOrders",
      "health"
    ]);
  });

  it("combines tag + method + exclude (intersection of constraints)", () => {
    // pets tag, GET only, minus getPet
    expect(names({ tags: ["pets"], methods: ["GET"], exclude: ["getPet"] })).toEqual(["listPets"]);
  });

  it("supports the ? single-char wildcard", () => {
    // "getPe?" → getPet (one char after getPe), not listPets
    expect(names({ include: ["getPe?"] })).toEqual(["getPet"]);
  });

  it("does not crash on a leading ? glob (regex-special escaped)", () => {
    expect(() => run({ include: ["?etPet"] })).not.toThrow();
    expect(names({ include: ["?etPet"] })).toEqual(["getPet"]);
  });

  it("treats other regex metacharacters literally", () => {
    // a '.' in the glob must match a literal dot, not any char
    expect(names({ include: ["getPet."] })).toEqual([]);
  });

  it("caps at maxTools and reports the truncation", () => {
    const res = run({ maxTools: 3 });
    expect(res.tools).toHaveLength(3);
    expect(res.dropped).toBe(tools.length - 3);
    expect(res.truncated).toBe(true);
    expect(res.capDropped).toBe(tools.length - 3);
  });

  it("reports capDropped separately from filter-dropped", () => {
    // tag keeps 4, cap to 1 → 3 dropped by the cap specifically
    const res = run({ tags: ["pets"], maxTools: 1 });
    expect(res.tools).toHaveLength(1);
    expect(res.capDropped).toBe(3);
    expect(res.dropped).toBe(tools.length - 1);
  });

  it("does not flag truncation when under the cap", () => {
    expect(run({ maxTools: 100 }).truncated).toBe(false);
  });

  it("reports how many were dropped by filters", () => {
    const res = run({ tags: ["orders"] });
    expect(res.dropped).toBe(tools.length - 2);
  });

  it("glob matching is case-insensitive on names", () => {
    expect(names({ include: ["LISTPETS"] })).toEqual(["listPets"]);
  });
});
