import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",          // Middleware läuft Server-seitig
    globals: true,                // describe/it/expect ohne Import
    include: ["**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    // gut bei Windows/CI:
    clearMocks: true,
    restoreMocks: true,
  },
});
