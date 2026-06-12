import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // CLI entry + MCP transport wiring are exercised by the live `--list`
      // demo and manual smoke tests, not unit tests.
      exclude: ["src/**/*.test.ts", "src/cli.ts", "src/server.ts", "src/index.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
});
