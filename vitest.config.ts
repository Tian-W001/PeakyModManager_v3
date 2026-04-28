import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true, // Allows using describe, it, expect without import, but in my test file I imported them just in case.
    environment: "node",
  },
  resolve: {
    alias: {
      "@renderer": resolve(__dirname, "src/renderer/src"),
      "@shared": resolve(__dirname, "src/shared"),
      src: resolve(__dirname, "src"),
    },
  },
});
