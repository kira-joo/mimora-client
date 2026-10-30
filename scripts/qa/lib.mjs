// Shared by the QA scripts. Two jobs: point every check at the store that is
// ACTUALLY being served (no hardcoded demo slugs — Phase 7 runs the same gates
// against two different merchants), and make a "dark" pass prove it rendered
// dark (a sweep that silently re-tests light under a dark label is the failure
// the plan's four-combination rule exists to catch).
import { chromium } from "playwright";

export const base = (process.argv[2] ?? process.env.STOREFRONT_URL ?? "http://localhost:3030").replace(/\/$/, "");

/** Installed Chrome locally; the bundled Chromium in CI (`npx playwright install chromium`). */
export function launch() {
  const channel = process.env.PW_CHANNEL ?? (process.env.CI ? undefined : "chrome");
  return chromium.launch(channel ? { channel } : {});
}

/**
 * The store's real routes, from its own sitemap and live availability. An
 * empty sitemap is a failure, not "nothing to test": it means SITE_URL is
 * unset or the catalog is empty, and either makes every later PASS vacuous.
 */
export async function discover() {
  const xml = await (await fetch(`${base}/sitemap.xml`)).text();
  const paths = [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(/^\/(ar|en)(?=\/|$)/, "")))];
  const of = (prefix) => paths.filter((p) => p.startsWith(`${prefix}/`)).map((p) => p.slice(prefix.length + 1)).sort();
  const products = of("/products");
  if (products.length === 0) throw new Error(`discover: ${base}/sitemap.xml lists no products — is SITE_URL set and the store seeded?`);

  const availability = {};
  for (const slug of products) {
    const response = await fetch(`${base}/api/catalog/availability/${slug}`);
    if (response.ok) availability[slug] = await response.json();
  }
  const purchasable = products.filter((slug) => availability[slug]?.variants?.some((v) => v.purchasable));
  const soldOut = products.filter((slug) => availability[slug] && !availability[slug].variants?.some((v) => v.purchasable));
  if (purchasable.length === 0) throw new Error("discover: no product has a purchasable variant — nothing can be bought.");
  const searchTerm = purchasable[0].split("-").sort((a, b) => b.length - a.length)[0];
  return {
    products, purchasable, soldOut, availability, searchTerm,
    category: of("/categories")[0], collection: of("/collections")[0], page: of("/pages")[0],
  };
}

/** The routes every sweep visits, built from what the store serves. */
export function sweepRoutes(store) {
  return [
    "/",
    "/products",
    "/products?sort=price_asc",
    ...(store.category ? [`/categories/${store.category}`] : []),
    ...(store.collection ? [`/collections/${store.collection}`] : []),
    `/products/${store.purchasable[0]}`,
    ...(store.purchasable[1] ? [`/products/${store.purchasable[1]}`] : []),
    ...(store.soldOut[0] ? [`/products/${store.soldOut[0]}`] : []),
    `/search?q=${encodeURIComponent(store.searchTerm)}`,
    "/cart",
    "/checkout",
    "/login",
    "/signup",
    "/forgot-password",
    ...(store.page ? [`/pages/${store.page}`] : []),
    "/no-such-page",
  ];
}

/** Puts one purchasable line in the visitor's cart through the storefront's own BFF. */
export async function addLine(page, slug, quantity = 1) {
  return page.evaluate(async ({ slug, quantity }) => {
    const a = await (await fetch(`/api/catalog/availability/${slug}`)).json();
    const v = a.variants.find((x) => x.purchasable);
    const r = await fetch("/api/session/cart/lines", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variantId: v.variantId, quantity }) });
    return r.status;
  }, { slug, quantity });
}

/**
 * What ground the page SHOULD be on (from the attribute the server or the pre-paint script set —
 * tokens.css follows nothing else: there is no "system" mode, so the emulated colour scheme the gates
 * also vary must NOT change it), and what it IS on (from the painted background). Both, so a mismatch
 * is a finding.
 */
export function groundOf(page) {
  return page.evaluate(() => {
    const expected = document.documentElement.getAttribute("data-ground") === "dark" ? "dark" : "light";
    const [r, g, b] = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g).map(Number);
    const lum = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const luminance = 0.2126 * lum(r) + 0.7152 * lum(g) + 0.0722 * lum(b);
    return { expected, rendered: luminance < 0.2 ? "dark" : "light" };
  });
}
