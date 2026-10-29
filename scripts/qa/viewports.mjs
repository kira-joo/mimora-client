// Viewport + stability sweep (MDS §16, Phase 6 verification): every route at 375/768/1024/1440,
// both locales, both grounds. Fails on horizontal page overflow, page errors, console errors,
// or layout shift (CLS) above the MDS §22 budget.
// Routes come from the store being served (scripts/qa/lib.mjs), and every pass asserts the ground
// it actually painted matches the one it claims to test.
// Usage: node scripts/qa/viewports.mjs [baseUrl]   (default http://localhost:3030; ROUTES=a,b overrides)
import { base, discover, groundOf, launch, sweepRoutes } from "./lib.mjs";

const ROUTES = process.env.ROUTES ? process.env.ROUTES.split(",") : sweepRoutes(await discover());
const WIDTHS = [375, 768, 1024, 1440];
const CLS_BUDGET = 0.05;
const IGNORE = /Download the React DevTools|Failed to load resource: the server responded with a status of 404/;

const browser = await launch();
const rendered = new Set();
let failures = 0;
let runs = 0;
for (const ground of ["light", "dark"]) {
  for (const locale of ["ar", "en"]) {
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: ground });
      await context.addInitScript(() => {
        window.__cls = 0;
        new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value; }).observe({ type: "layout-shift", buffered: true });
      });
      const page = await context.newPage();
      const problems = [];
      page.on("pageerror", (error) => problems.push(`pageerror ${error.message.slice(0, 120)}`));
      page.on("console", (message) => { if (message.type() === "error" && !IGNORE.test(message.text())) problems.push(`console ${message.text().replace(/\s+/g, " ").slice(0, 140)}`); });
      for (const route of ROUTES) {
        problems.length = 0;
        await page.goto(`${base}/${locale}${route === "/" ? "" : route}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(500);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        const cls = await page.evaluate(() => window.__cls ?? 0);
        const paint = await groundOf(page);
        rendered.add(paint.rendered);
        runs++;
        const issues = [...(overflow > 0 ? [`overflow ${overflow}px`] : []), ...(cls > CLS_BUDGET ? [`CLS ${cls.toFixed(3)}`] : []), ...(paint.rendered !== paint.expected ? [`ground: should be ${paint.expected}, painted ${paint.rendered}`] : []), ...problems];
        if (issues.length) {
          failures++;
          console.log(`FAIL ${ground}/${locale}/${width} ${route}: ${issues.join(" | ")}`);
        }
      }
      await context.close();
    }
  }
}
await browser.close();
console.log(`viewports: ${runs} page loads (${ROUTES.length} routes × 4 widths × 2 locales × 2 system schemes) — ${failures} with problems. Grounds actually painted: ${[...rendered].join(", ")}.`);
process.exit(failures ? 1 : 0);
