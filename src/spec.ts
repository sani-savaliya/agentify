import SwaggerParser from "@apidevtools/swagger-parser";

/**
 * Loads and fully dereferences an OpenAPI / Swagger document from a file path,
 * URL, or in-memory object. All `$ref`s are resolved so downstream stages never
 * have to chase pointers.
 *
 * We use `dereference` rather than `validate` on purpose: real-world specs are
 * frequently a little out of spec, and we would rather expose a slightly-wrong
 * tool than refuse to start.
 */
export async function loadSpec(source: string | object): Promise<any> {
  // SwaggerParser mutates/clones the input; cast keeps TS happy across versions.
  return (await SwaggerParser.dereference(source as any)) as any;
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * Resolves the base URL the operations should be called against.
 *
 * Precedence:
 *   1. explicit override (CLI flag)
 *   2. OpenAPI 3.x `servers[0].url` (with server-variable defaults substituted)
 *   3. Swagger 2.0 `schemes`/`host`/`basePath`
 */
export function resolveBaseUrl(spec: any, override?: string): string {
  if (override) return stripTrailingSlash(override);

  if (Array.isArray(spec?.servers) && spec.servers.length > 0) {
    const server = spec.servers[0];
    let url: string = server.url ?? "";
    const vars = server.variables ?? {};
    for (const [key, def] of Object.entries<any>(vars)) {
      url = url.split(`{${key}}`).join(def?.default ?? "");
    }
    return stripTrailingSlash(url);
  }

  if (spec?.host) {
    const scheme = Array.isArray(spec.schemes) && spec.schemes.length > 0 ? spec.schemes[0] : "https";
    return stripTrailingSlash(`${scheme}://${spec.host}${spec.basePath ?? ""}`);
  }

  return "";
}
