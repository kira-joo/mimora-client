// SEO surface check (plan #14, #15, #4): the JSON-LD and breadcrumbs a crawler
// actually receives, in both locales — no browser needed, the markup is
// server-rendered. Exits 1 on any failure. A page that carries NO JSON-LD at
// all is a failure, not a skip: the usual cause is SITE_URL unset, which makes
// every absolute URL (and so the whole mechanism) vanish.
// Usage: node scripts/qa/seo.mjs [baseUrl]   (default http://localhost:3030)
import { base, discover } from "./lib.mjs";

const store = await discover();
let failures = 0;
const check = (ok, message) => {
  if (!ok) {
    failures++;
    console.log(`  FAIL ${message}`);
  }
};

const blocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
const ofType = (list, type) => list.filter((entry) => entry["@type"] === type);
const hasBreadcrumbNav = (html) => /<nav[^>]*aria-label="[^"]+"[^>]*>\s*<ol[\s\S]*?<\/ol>\s*<\/nav>/.test(html);
const get = async (path) => (await fetch(`${base}${path}`)).text();

for (const locale of ["ar", "en"]) {
  console.log(`seo ${locale}`);

  const home = blocks(await get(`/${locale}`));
  const stores = ofType(home, "OnlineStore");
  check(stores.length === 1, `/${locale}: expected one OnlineStore JSON-LD, found ${stores.length} (is SITE_URL set?)`);
  if (stores[0]) check(typeof stores[0].url === "string" && stores[0].url.startsWith("http"), `/${locale}: OnlineStore.url is not absolute`);

  const productPath = `/${locale}/products/${store.purchasable[0]}`;
  const productHtml = await get(productPath);
  const productBlocks = blocks(productHtml);
  const [product] = ofType(productBlocks, "Product");
  check(Boolean(product), `${productPath}: no Product JSON-LD`);
  for (const offer of product?.offers ?? []) {
    check(Boolean(offer.sku), `${productPath}: an Offer has no sku`);
    check(typeof offer.url === "string" && offer.url.startsWith("http"), `${productPath}: Offer ${offer.sku} has no absolute url`);
    check(Boolean(offer.priceCurrency) && offer.priceCurrency !== "undefined", `${productPath}: Offer ${offer.sku} has no priceCurrency`);
    check(/^https:\/\/schema\.org\/(InStock|OutOfStock|BackOrder)$/.test(offer.availability ?? ""), `${productPath}: Offer ${offer.sku} availability is ${offer.availability}`);
  }
  check(!JSON.stringify(productBlocks).includes("undefined"), `${productPath}: the literal text "undefined" reached the structured data`);
  const [crumbs] = ofType(productBlocks, "BreadcrumbList");
  check(Boolean(crumbs) && crumbs.itemListElement.length >= 2, `${productPath}: BreadcrumbList missing or shorter than 2`);
  check(crumbs?.itemListElement.every((item, index) => item.position === index + 1), `${productPath}: BreadcrumbList positions are not 1..n`);
  check(hasBreadcrumbNav(productHtml), `${productPath}: no visible nav > ol breadcrumbs`);

  for (const [label, path] of [["category", store.category && `/${locale}/categories/${store.category}`], ["collection", store.collection && `/${locale}/collections/${store.collection}`]]) {
    if (!path) continue;
    const html = await get(path);
    check(ofType(blocks(html), "BreadcrumbList").length === 1, `${path}: ${label} page has no BreadcrumbList`);
    check(hasBreadcrumbNav(html), `${path}: ${label} page has no visible breadcrumbs`);
  }
}

const sitemap = await get("/sitemap.xml");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
console.log(`sitemap: ${locs.length} urls, ${store.products.length} products, brands ${locs.filter((loc) => loc.includes("/brands/")).length}`);
check(locs.length > 0, "sitemap is empty");

console.log(failures ? `seo: ${failures} failure(s)` : "seo: OK");
process.exit(failures ? 1 : 0);
