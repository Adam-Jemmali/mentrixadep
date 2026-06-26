import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: [
      "src/features/**/*.test.ts",
      "src/shared/**/*.test.ts",
      "tests/unit/**/*.test.ts",
      "scripts/**/*.test.ts",
    ],
    passWithNoTests: false,
  },
});
