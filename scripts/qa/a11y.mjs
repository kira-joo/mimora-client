// Automated accessibility pass (Phase 6 verification): axe-core on every route,
// in both locales and on both grounds. Exits 1 on any serious/critical violation.
// Routes come from the store being served (scripts/qa/lib.mjs); a pass whose painted ground differs
// from the one it claims to audit is itself a failure.
// Usage: node scripts/qa/a11y.mjs [baseUrl]   (default http://localhost:3030)
import { AxeBuilder } from "@axe-core/playwright";
import { addLine, base, discover, groundOf, launch, sweepRoutes } from "./lib.mjs";

const store = await discover();
const ROUTES = sweepRoutes(store).map((route) => (route === "/" ? "" : route));
const browser = await launch();
const rendered = new Set();
let failures = 0;
const summary = new Map();
for (const ground of ["light", "dark"]) {
  for (const locale of ["ar", "en"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 }, colorScheme: ground });
    // A seeded line so cart and checkout are audited in their real state, not their empty one.
    const page = await context.newPage();
    await page.goto(`${base}/${locale}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await addLine(page, store.purchasable[0]);
    for (const route of ROUTES) {
      await page.goto(`${base}/${locale}${route}`, { waitUntil: "load", timeout: 60_000 });
      await page.waitForTimeout(1200);
      const paint = await groundOf(page);
      rendered.add(paint.rendered);
      if (paint.rendered !== paint.expected) {
        failures++;
        console.log(`  ground mismatch on ${ground}/${locale}${route || "/"}: should be ${paint.expected}, painted ${paint.rendered}`);
      }
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const serious = result.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
      for (const violation of serious) {
        failures++;
        const key = `${violation.id} (${violation.impact})`;
        const where = `${ground}/${locale}${route || "/"} ×${violation.nodes.length}`;
        summary.set(key, [...(summary.get(key) ?? []), where]);
        if ((summary.get(key) ?? []).length === 1) console.log(`  ${key}: ${violation.help}\n    e.g. ${violation.nodes[0]?.target.join(" ")} — ${violation.nodes[0]?.failureSummary?.split("\n")[1]?.trim() ?? ""}`);
      }
    }
    await context.close();
  }
}
await browser.close();
console.log(`\na11y: ${ROUTES.length} routes × 2 locales × 2 system schemes — ${failures} failure(s). Grounds actually painted: ${[...rendered].join(", ")}.`);
for (const [key, where] of summary) console.log(`  ${key}: ${where.length} page(s) — ${where.slice(0, 6).join(", ")}${where.length > 6 ? "…" : ""}`);
process.exit(failures ? 1 : 0);
