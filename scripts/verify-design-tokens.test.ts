// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

/**
 * "A test that cannot fail proves nothing" (Phase 7 §5). The guard runs on
 * predev/prebuild against the real tree, where it passes — which by itself
 * cannot tell a working guard from one that matches nothing. So each rule is
 * fed a planted violation in a throwaway tree and must turn the run red.
 */
const SCRIPT = join(__dirname, "verify-design-tokens.mjs");
const roots: string[] = [];

function tree(files: Record<string, string>, brandStrings = ["Planted Merchant", "تاجر مزروع"]) {
  const root = mkdtempSync(join(tmpdir(), "tokens-guard-"));
  roots.push(root);
  mkdirSync(join(root, "scripts"));
  writeFileSync(join(root, "scripts/brand-strings.json"), JSON.stringify({ strings: brandStrings }));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), body);
  }
  return root;
}

function run(root: string) {
  const result = spawnSync(process.execPath, [SCRIPT], { env: { ...process.env, VERIFY_TOKENS_ROOT: root }, encoding: "utf8" });
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("verify-design-tokens guard", () => {
  it("passes a clean tree, and says how much it scanned", () => {
    const { code, out } = run(tree({ "src/ok.tsx": `export const Ok = () => <p className="text-ink">ok</p>;\n` }));
    expect(code).toBe(0);
    expect(out).toContain("scanned 1 files");
  });

  it.each([
    ["hexColor", `const c = "#9F4E19";`],
    ["phone", `const p = "+20 100 555 0142";`],
    ["phone", `const p = "01005550142";`],
    ["socialUrl", `const u = "https://instagram.com/some.shop";`],
    ["brandString", `const n = "Planted Merchant";`],
    ["brandString", `const n = "تَاجِر مزروع";`], // diacritics must not hide it
    ["motionLiteral", `const t = { duration: 0.3 };`],
  ])("goes red on a planted %s: %s", (rule, line) => {
    const { code, out } = run(tree({ "src/leak.ts": `${line}\n` }));
    expect(code).toBe(1);
    expect(out).toContain(`[${rule}]`);
  });

  it("refuses to run with an empty brand list rather than passing vacuously", () => {
    const { code, out } = run(tree({ "src/ok.ts": "export {};\n" }, []));
    expect(code).toBe(1);
    expect(out).toMatch(/lists no strings/);
  });

  it("refuses a tree with nothing to scan", () => {
    const { code, out } = run(tree({ "src/only.test.ts": `const c = "#000000";\n` }));
    expect(code).toBe(1);
    expect(out).toMatch(/scanned 0 files/);
  });
});
