import { describe, it, expect } from "vitest";
import { parseArgs } from "./args.js";

describe("parseArgs", () => {
  it("takes the first non-flag argument as the spec source", () => {
    expect(parseArgs(["./openapi.yaml"]).source).toBe("./openapi.yaml");
  });

  it("collects repeatable filter flags", () => {
    const a = parseArgs(["spec", "--tag", "repos", "--tag", "issues", "--method", "GET"]);
    expect(a.filter.tags).toEqual(["repos", "issues"]);
    expect(a.filter.methods).toEqual(["GET"]);
  });

  it("parses include/exclude globs and read-only", () => {
    const a = parseArgs(["spec", "--include", "*Pet*", "--exclude", "delete*", "--read-only"]);
    expect(a.filter.include).toEqual(["*Pet*"]);
    expect(a.filter.exclude).toEqual(["delete*"]);
    expect(a.filter.readOnly).toBe(true);
  });

  it("parses a valid --max-tools", () => {
    expect(parseArgs(["spec", "--max-tools", "25"]).filter.maxTools).toBe(25);
  });

  it("throws when a value-taking flag has no value", () => {
    expect(() => parseArgs(["spec", "--tag"])).toThrow(/--tag requires a value/);
    expect(() => parseArgs(["spec", "--include"])).toThrow(/--include requires a value/);
  });

  it("throws on a non-numeric or non-positive --max-tools instead of silently ignoring it", () => {
    expect(() => parseArgs(["spec", "--max-tools", "foo"])).toThrow(/positive integer/);
    expect(() => parseArgs(["spec", "--max-tools", "0"])).toThrow(/positive integer/);
    expect(() => parseArgs(["spec", "--max-tools", "-3"])).toThrow(/positive integer/);
    expect(() => parseArgs(["spec", "--max-tools"])).toThrow(/requires a value/);
  });

  it("parses --list and --help flags", () => {
    expect(parseArgs(["spec", "--list"]).list).toBe(true);
    expect(parseArgs(["--help"]).help).toBe(true);
  });

  it("parses a repeatable --header into the headers map", () => {
    const a = parseArgs(["spec", "--header", "X-Org-Id: 42"]);
    expect(a.headers["X-Org-Id"]).toBe("42");
  });
});
