import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ENV_VAR_NAMES } from "./env-validation";

/**
 * Every environment variable `src` reads is declared in `env-validation.ts`, and
 * every declared variable is read. Test files are excluded (they assign their own
 * fixtures). Recognised reads: `process.env.X`, `process.env["X"]`, and a bare
 * `env.X` (the pure `configurationGaps` takes `env` as a parameter).
 */
const SRC = path.resolve(__dirname, "../..");

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) found.push(full);
  }
  return found;
}

const NAME = "[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*";
const READS = [
  new RegExp(`process\\.env\\.(${NAME})\\b`, "g"),
  new RegExp(`process\\.env\\[\\s*["'\`](${NAME})["'\`]\\s*\\]`, "g"),
  new RegExp(`(?<![\\w.])env\\.(${NAME})\\b`, "g"),
];

function variablesRead(): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, "utf8");
    for (const pattern of READS) for (const match of text.matchAll(pattern)) if (!found.has(match[1]!)) found.set(match[1]!, path.relative(SRC, file));
  }
  return found;
}

describe("environment inventory", () => {
  it("finds the reads it is supposed to find (a scanner that matches nothing proves nothing)", () => {
    const read = variablesRead();
    for (const name of ["STAFF_API_URL", "REVALIDATE_SECRET", "SITE_URL", "STORE_TIMEZONE", "TRUST_X_REAL_IP", "NODE_ENV"]) expect(read.has(name), name).toBe(true);
  });

  it("every variable src reads is declared in env-validation.ts", () => {
    const undeclared = [...variablesRead()].filter(([name]) => !ENV_VAR_NAMES.has(name)).map(([name, file]) => `${name} (read in ${file})`);
    expect(undeclared).toEqual([]);
  });

  it("every declared variable is read somewhere in src", () => {
    const read = variablesRead();
    expect([...ENV_VAR_NAMES].filter((name) => !read.has(name))).toEqual([]);
  });
});
