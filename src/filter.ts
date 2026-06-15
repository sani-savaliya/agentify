import type { ToolDef } from "./types.js";

/** Options for narrowing a generated tool set down to what an agent needs. */
export interface FilterOptions {
  /** Keep only operations carrying at least one of these OpenAPI tags. */
  tags?: string[];
  /** Drop operations carrying any of these tags. */
  excludeTags?: string[];
  /** Keep only these HTTP methods (case-insensitive). */
  methods?: string[];
  /** Shorthand for methods = GET/HEAD/OPTIONS. Takes precedence over `methods`. */
  readOnly?: boolean;
  /** Keep only tools whose operationId or "METHOD path" matches a glob. */
  include?: string[];
  /** Drop tools whose operationId or "METHOD path" matches a glob. */
  exclude?: string[];
  /** Hard cap on the number of tools (applied last). */
  maxTools?: number;
}

export interface FilterResult {
  tools: ToolDef[];
  /** How many tools were removed in total (filters + cap). */
  dropped: number;
  /** True if `maxTools` truncated the set (so callers can warn loudly). */
  truncated: boolean;
  /** How many tools were removed specifically by the `maxTools` cap. */
  capDropped: number;
}

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

/**
 * Converts a shell-style glob into an anchored, case-insensitive RegExp.
 * Supports `*` (any run) and `?` (any single char); all other regex
 * metacharacters are escaped so they match literally.
 */
function globToRegExp(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape regex specials (not * or ?)
    .replace(/\*/g, ".*") // * -> any run
    .replace(/\?/g, "."); // ? -> any single char
  return new RegExp(`^${escaped}$`, "i");
}

function matchesAny(globs: RegExp[], candidates: string[]): boolean {
  return candidates.some((c) => globs.some((r) => r.test(c)));
}

/** The strings a glob is tested against for one tool. */
function candidatesOf(t: ToolDef): string[] {
  return [t.name, `${t.operation.method} ${t.operation.path}`];
}

/**
 * Narrows a generated tool set. Filters are pure and order-preserving; the
 * `maxTools` cap is applied last and surfaced via `truncated` so the caller can
 * warn instead of silently dropping tools.
 */
export function filterTools(all: ToolDef[], opts: FilterOptions): FilterResult {
  const total = all.length;
  let tools = all;

  const methods = opts.readOnly ? SAFE_METHODS : opts.methods;
  if (methods && methods.length) {
    const set = new Set(methods.map((m) => m.toUpperCase()));
    tools = tools.filter((t) => set.has(t.operation.method.toUpperCase()));
  }

  if (opts.tags && opts.tags.length) {
    const want = new Set(opts.tags);
    tools = tools.filter((t) => (t.operation.tags ?? []).some((tag) => want.has(tag)));
  }

  if (opts.excludeTags && opts.excludeTags.length) {
    const no = new Set(opts.excludeTags);
    tools = tools.filter((t) => !(t.operation.tags ?? []).some((tag) => no.has(tag)));
  }

  if (opts.include && opts.include.length) {
    const globs = opts.include.map(globToRegExp);
    tools = tools.filter((t) => matchesAny(globs, candidatesOf(t)));
  }

  if (opts.exclude && opts.exclude.length) {
    const globs = opts.exclude.map(globToRegExp);
    tools = tools.filter((t) => !matchesAny(globs, candidatesOf(t)));
  }

  const keptByFilters = tools.length;
  let truncated = false;
  if (opts.maxTools !== undefined && tools.length > opts.maxTools) {
    tools = tools.slice(0, opts.maxTools);
    truncated = true;
  }
  const capDropped = keptByFilters - tools.length;

  return { tools, dropped: total - tools.length, truncated, capDropped };
}
