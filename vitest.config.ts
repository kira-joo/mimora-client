import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src"), src: path.resolve(__dirname, "./src") } },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    /*
     * `next-intl/middleware` imports `next/server`, which Next exposes only through its package exports map; Node's
     * raw ESM resolution does not consult it for a bare subpath. Inlining routes the import through Vite's resolver.
     * Test-harness-only — the Next build resolves it on its own (src/proxy.test.ts).
     */
    server: { deps: { inline: ["server-only", /next-intl/] } },
  },
});
