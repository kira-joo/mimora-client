import { describe, expect, it } from "vitest";
import ar from "./locales/ar/common.json";
import en from "./locales/en/common.json";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[path] = v;
    else Object.assign(out, flatten(v, path));
  }
  return out;
}

/** Top-level ICU argument names: `{name}`, `{count, plural, ...}` -> name/count. */
export function placeholders(message: string): string[] {
  const names = new Set<string>();
  for (const m of message.matchAll(/\{\s*([A-Za-z_][\w]*)\s*[,}]/g)) names.add(m[1]);
  return [...names].sort();
}

export function parityProblems(a: Record<string, string>, b: Record<string, string>) {
  const problems: string[] = [];
  for (const k of Object.keys(a)) if (!(k in b)) problems.push(`missing in other locale: ${k}`);
  for (const k of Object.keys(b)) if (!(k in a)) problems.push(`missing in first locale: ${k}`);
  for (const k of Object.keys(a)) {
    if (k in b && placeholders(a[k]).join() !== placeholders(b[k]).join()) problems.push(`placeholder mismatch: ${k}`);
  }
  return problems;
}

const flatAr = flatten(ar as Tree);
const flatEn = flatten(en as Tree);

describe("locale messages", () => {
  it("ar and en have exactly the same key set", () => {
    expect(Object.keys(flatAr).sort()).toEqual(Object.keys(flatEn).sort());
  });
  it("has no empty values", () => {
    const empty = [...Object.entries(flatAr).map(([k, v]) => ["ar", k, v]), ...Object.entries(flatEn).map(([k, v]) => ["en", k, v])]
      .filter(([, , v]) => v.trim() === "")
      .map(([l, k]) => `${l}:${k}`);
    expect(empty).toEqual([]);
  });
  it("uses the same ICU placeholders in both locales", () => {
    expect(parityProblems(flatEn, flatAr)).toEqual([]);
  });
});

describe("parity helpers can fail", () => {
  it("detects a missing key", () => {
    expect(parityProblems({ a: "x", b: "y" }, { a: "x" })).toEqual(["missing in other locale: b"]);
  });
  it("detects a placeholder mismatch", () => {
    expect(parityProblems({ a: "Hi {name}" }, { a: "مرحبا" })).toEqual(["placeholder mismatch: a"]);
  });
  it("extracts plural arguments", () => {
    expect(placeholders("{count, plural, one {# item} other {# items}} for {name}")).toEqual(["count", "name"]);
  });
});
