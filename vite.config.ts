import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: "c8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{js,ts}"],
      exclude: ["**/*.test.{js,ts}", "src/types.ts"],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
});
