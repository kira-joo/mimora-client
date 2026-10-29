#!/usr/bin/env node
/**
 * Reusability guard (CLAUDE.md non-negotiable 1: "No brand value in source").
 * Runs on predev/prebuild; exits 1 on any violation.
 *
 * Scans src/**\/*.{ts,tsx,css}. NOT scanned, by design:
 *  - src/preview/** and src/app/preview/**: the isolated design preview. It holds
 *    mock merchant data on purpose and never ships: a production build 404s it
 *    unless DESIGN_PREVIEW=1.
 *  - *.test.ts / *.test.tsx: tests legitimately contain fixture literals.
 *  - src/styles/tokens.css is THE token layer: hex values (and cubic-bezier /
 *    durations) are allowed there and only there.
 *
 * Rules: hexColor, phone, socialUrl, brandString (scripts/brand-strings.json,
 * wider than the restaurant guard, which has no brand-name/copy rule),
 * motionLiteral (raw durations/easings). A line may opt out with a
 * `design-tokens-ignore: <reason>` comment, which forces the reason into the diff.
 * The scan prints its file count so a silent pass is distinguishable from
 * scanning nothing.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

// VERIFY_TOKENS_ROOT exists only so the guard's own test can point it at a
// deliberately broken tree (src/lib/config/verify-design-tokens.test.ts).
const ROOT = process.env.VERIFY_TOKENS_ROOT ?? join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "src");
const TOKENS = "src/styles/tokens.css";

const SKIP_DIRS = ["src/preview", "src/app/preview"];
const isSkipped = (rel) =>
  SKIP_DIRS.some((d) => rel === d || rel.startsWith(d + "/")) || /\.test\.tsx?$/.test(rel);

/**
 * Reviewed exemptions: { rule: [{ file, pattern?, reason }] }. `pattern` (a
 * RegExp tested against the MATCHED text) narrows an exemption to one shape; omit
 * it only for a whole-file exemption.
 */
const MOTION_MIRROR =
  "Motion `transition={{ duration, ease }}` object that mirrors --sf-duration-*/--sf-ease-standard (JS animation props cannot read CSS custom properties without a runtime lookup); so src/lib/motion/tokens.ts is the ONE mirror (its test fails if it drifts from tokens.css); every component imports it.";

const EXEMPTIONS = {
  hexColor: [{ file: TOKENS, reason: "The token layer is where hex values live." }],
  motionLiteral: [
    { file: TOKENS, reason: "The token layer defines the durations and easings." },
    { file: "src/lib/motion/tokens.ts", reason: MOTION_MIRROR },
  ],
  socialUrl: [
    {
      file: "src/components/chrome/footer.tsx",
      pattern: /^https?:\/\/wa\.me\/\$\{/,
      reason: "Template over the merchant's configured WhatsApp number (digits from StoreProfile); no literal number or brand value.",
    },
    {
      file: "src/app/[locale]/forgot-password/page.tsx",
      pattern: /^https?:\/\/wa\.me\/\$\{/,
      reason: "Template over the merchant's configured WhatsApp number (digits from StoreProfile); no literal number or brand value.",
    },
  ],
  phone: [],
  brandString: [],
};

const strip = (s) => s.normalize("NFC").replace(/[ً-ْـ]/g, "").toLowerCase();

const brand = JSON.parse(readFileSync(join(ROOT, "scripts/brand-strings.json"), "utf8"));
const BRAND = brand.strings.map((s) => ({ raw: s, norm: strip(s) }));
if (BRAND.length === 0) {
  console.error("verify-design-tokens: scripts/brand-strings.json lists no strings; refusing to run an empty brand rule.");
  process.exit(1);
}

const SOCIAL_HOSTS =
  "(?:facebook\\.com|fb\\.com|fb\\.me|instagram\\.com|tiktok\\.com|twitter\\.com|x\\.com|wa\\.me|whatsapp\\.com|youtube\\.com|youtu\\.be|linkedin\\.com|snapchat\\.com|t\\.me|telegram\\.me)";

/** Line-based rules. `find(line)` returns matched strings. */
const RULES = [
  {
    id: "hexColor",
    find: (l) => l.match(/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g) ?? [],
    message: "Hardcoded hex colour. Use a design token (tokens.css) instead.",
  },
  {
    id: "phone",
    find: (l) =>
      l.match(
        /(?<![\w.#/-])(?:\+\d{1,3}[\s-]?\(?\d{1,4}\)?(?:[\s-]?\d{2,4}){2,4}|\b0(?:10|11|12|15)[\s-]?\d{3,4}[\s-]?\d{3,4})(?![\w])/g
      ) ?? [],
    message: "Hardcoded phone number. Contact details are StoreProfile data, not source.",
  },
  {
    id: "socialUrl",
    find: (l) => l.match(new RegExp(`(?:https?:)?\\/\\/(?:www\\.)?${SOCIAL_HOSTS}[^\\s"'\`)]*`, "gi")) ?? [],
    message: "Hardcoded social/messaging URL. These are StoreProfile data, not source.",
  },
  {
    id: "brandString",
    find: (l) => {
      const n = strip(l);
      return BRAND.filter((b) => n.includes(b.norm)).map((b) => b.raw);
    },
    message: "Merchant identity string in platform code (a merchant leaked into src/). See scripts/brand-strings.json.",
  },
  {
    id: "motionLiteral",
    find: (l) =>
      l.match(
        /\bduration-\d+\b|\bdelay-\d+\b|\bease-\[(?!var\()[^\]]+\]|\b(?:duration|delay)-\[(?!var\()[^\]]+\]|\btransition(?:-duration)?:\s*[^;]*\b\d*\.?\d+m?s\b|\banimation(?:-duration)?:\s*[^;]*\b\d*\.?\d+m?s\b|cubic-bezier\(|\bduration:\s*[\d.]+|\bease:\s*\[/g
      ) ?? [],
    message: "Raw duration/easing. Use the design tokens (tokens.css) instead.",
  },
];

function collect(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) collect(full, out);
    else if ([".ts", ".tsx", ".css"].includes(extname(full))) out.push(full);
  }
  return out;
}

const exempt = (rule, file, matched) =>
  (EXEMPTIONS[rule] ?? []).some((x) => x.file === file && (!x.pattern || x.pattern.test(matched)));

const all = collect(SRC).map((f) => relative(ROOT, f).split(sep).join("/")).sort();
const files = all.filter((f) => !isSkipped(f));
const violations = [];
const counts = {};

for (const rel of files) {
  readFileSync(join(ROOT, rel), "utf8").split("\n").forEach((line, i) => {
    if (line.includes("design-tokens-ignore")) return;
    for (const rule of RULES) {
      for (const m of rule.find(line)) {
        if (exempt(rule.id, rel, m)) {
          counts[rule.id] = (counts[rule.id] ?? 0) + 1;
          continue;
        }
        violations.push({ rel, line: i + 1, rule: rule.id, m, message: rule.message });
      }
    }
  });
}

console.log(`verify-design-tokens: scanned ${files.length} files (${all.length - files.length} excluded: preview/tests).`);
if (files.length === 0) {
  console.error("verify-design-tokens: scanned 0 files; the guard is not measuring anything.");
  process.exit(1);
}
if (Object.keys(counts).length) console.log(`  exempted matches: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(", ")}`);

if (violations.length) {
  console.error(`\nverify-design-tokens: ${violations.length} violation(s).\n`);
  for (const v of violations) console.error(`  ${v.rel}:${v.line}  [${v.rule}]  ${v.m}\n    ${v.message}`);
  console.error(
    "\n  If a literal is genuinely correct, add a reviewed EXEMPTION (file + pattern + reason) in\n  scripts/verify-design-tokens.mjs, or a `design-tokens-ignore: <reason>` comment. Never delete the rule.\n"
  );
  process.exit(1);
}
console.log("verify-design-tokens: OK");
