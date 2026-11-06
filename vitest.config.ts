import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDirectory,
      "server-only": path.join(rootDirectory, "tests/mocks/server-only.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.{ts,mjs}"],
    environment: "node",
  },
});
