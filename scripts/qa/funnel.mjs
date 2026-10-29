// The customer funnel, end to end, against whichever store is being served (Phase 7 §1: the same
// funnel must pass for two deliberately different merchants). Every journey reports PASS, FAIL, or
// BLOCKED — BLOCKED means a capability this environment does not have (named in the line), never a
// failure in disguise and never a pass. Exits 1 on any FAIL.
//
// Usage: node scripts/qa/funnel.mjs [storefrontUrl]
//   FIXTURE_MANIFEST=<file>   the seeder's manifest; when present the store's configuration is ASSERTED
//                             (guest checkout on/off, payment methods) instead of merely observed.
//   BACKEND_URL, OWNER_EMAIL, OWNER_PASSWORD   staff access, for the post-delivery journeys (the
//                             store has to ship and deliver an order before it can be returned or reviewed).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { addLine, base, discover, launch } from "./lib.mjs";

const results = [];
const report = (state, journey, message) => {
  results.push({ state, journey });
  console.log(`${state.padEnd(7)} ${journey}: ${message}`);
};
const check = (journey, condition, message) => report(condition ? "PASS" : "FAIL", journey, message);
const blocked = (journey, why) => report("BLOCKED", journey, why);

const manifest = process.env.FIXTURE_MANIFEST ? JSON.parse(readFileSync(process.env.FIXTURE_MANIFEST, "utf8")) : null;
const store = await discover();
const browser = await launch();
const phone = () => `010${String(Date.now()).slice(-8)}`;
const image = fileURLToPath(new URL("../../public/preview/images/tool-roll.jpg", import.meta.url));
console.log(`funnel: ${base} — ${store.products.length} products (${store.purchasable.length} purchasable, ${store.soldOut.length} sold out)${manifest ? `, asserting manifest for ${manifest.store}` : ""}`);

async function context(width = 1280) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  const net = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 140)));
  page.on("response", (r) => { if (new URL(r.url()).pathname.startsWith("/api/")) net.push(`${r.request().method()} ${new URL(r.url()).pathname} ${r.status()}`); });
  // In-flight requests, so a page that never goes network-idle says WHAT never finished.
  const inFlight = new Map();
  page.on("request", (r) => inFlight.set(r, Date.now()));
  for (const done of ["requestfinished", "requestfailed"]) page.on(done, (r) => inFlight.delete(r));
  page.pendingRequests = () => [...inFlight].map(([r, at]) => `${r.method()} ${new URL(r.url()).pathname} (${Date.now() - at}ms)`);
  return { ctx, page, errors, net };
}

/**
 * Navigate: wait for `load`, then for network idle on a best-effort basis. Playwright's network-idle
 * wait can stall forever on a long single-tab journey (measured 2026-10-21, store-b): it keeps counting
 * requests from the PREVIOUS page whose completion it never registered, while both servers answered
 * everything in < 100ms. Each journey asserts its own outcome, so idle is a convenience, not a check.
 */
async function go(page, url) {
  await page.goto(url, { waitUntil: "load" });
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
}

/** Navigate and settle; a page that never settles is a FAIL naming its in-flight requests, not a crash. */
async function settle(page, url, journey) {
  try {
    await go(page, url);
    return true;
  } catch (error) {
    check(journey, false, `${url.replace(base, "")} never settled (${error.name}); in flight: ${page.pendingRequests().join(", ") || "nothing"}`);
    return false;
  }
}

// ── Staff access (post-delivery only) ──────────────────────────────────────────────────────────────
let staffCookie = null;
if (process.env.BACKEND_URL && process.env.OWNER_EMAIL && process.env.OWNER_PASSWORD) {
  const r = await fetch(`${process.env.BACKEND_URL}/api/admin/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: process.env.OWNER_EMAIL, password: process.env.OWNER_PASSWORD }) });
  if (r.ok) staffCookie = r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  else console.log(`(staff login answered ${r.status} — post-delivery journeys will be BLOCKED)`);
}
// Every admin write that can move money or stock requires an Idempotency-Key (scoped by route and actor); a fresh one
// per call, as the console sends one per user action.
const admin = (method, path, body) =>
  fetch(`${process.env.BACKEND_URL}/api/admin${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: staffCookie, ...(method === "GET" ? {} : { "Idempotency-Key": crypto.randomUUID() }) },
    body: body && JSON.stringify(body),
  });

// ── 1. Product page → cart, in both locales ────────────────────────────────────────────────────────
const withAxes = store.purchasable.find((slug) => store.availability[slug].variants.some((v) => v.optionValues.length)) ?? store.purchasable[0];
for (const [locale, width] of [["ar", 390], ["en", 1280]]) {
  const J = `pdp→cart ${locale}`;
  const { ctx, page, errors, net } = await context(width);
  await go(page, `${base}/${locale}/products/${withAxes}`);
  check(J, net.some((n) => n.startsWith(`GET /api/catalog/availability/${withAxes} 200`)), "live availability fetched from the no-store route");
  // Choose, axis by axis, a value that is still available given the earlier choices (existential, never per-axis).
  for (const fieldset of await page.locator("main fieldset").all()) {
    const options = fieldset.locator('button[aria-pressed]:not([aria-disabled="true"])');
    for (const option of await options.all()) {
      if (!((await option.getAttribute("aria-label")) ?? "").includes("—")) { await option.click(); break; }
    }
  }
  await page.locator("main").getByRole("button", { name: locale === "ar" ? "أضف إلى السلة" : "Add to cart" }).first().click();
  await page.waitForTimeout(1500);
  check(J, net.some((n) => n.startsWith("POST /api/session/cart/lines 201")), "added through the storefront's own BFF");
  const cookies = await ctx.cookies();
  check(J, cookies.some((c) => c.name === "sf_cart" && c.httpOnly), "guest cart token held only in an httpOnly cookie");
  const cart = await page.evaluate(async () => (await fetch("/api/session/cart")).json());
  check(J, cart.lines?.length === 1 && !("cartToken" in cart), "the cart has the line and never exposes its token");
  check(J, !(await page.content()).includes(process.env.BACKEND_URL ?? ":3040"), "the page never names the backend origin");
  check(J, errors.length === 0, `no page errors ${errors.length ? JSON.stringify(errors) : ""}`);
  await ctx.close();
}

// ── 2. A sold-out product cannot be bought ─────────────────────────────────────────────────────────
if (store.soldOut[0]) {
  const { ctx, page, net } = await context();
  await go(page, `${base}/en/products/${store.soldOut[0]}`);
  const add = page.locator("main").getByRole("button", { name: "Add to cart" });
  if (await add.count()) await add.first().click({ trial: false }).catch(() => {});
  await page.waitForTimeout(800);
  check("sold out", !net.some((n) => n.startsWith("POST /api/session/cart/lines 2")), `${store.soldOut[0]}: nothing was added`);
  await ctx.close();
} else blocked("sold out", "the store has no sold-out product to test against");

// ── Checkout, shared by the guest and the signed-in journeys ───────────────────────────────────────
async function fillCheckout(page, locale, method) {
  const fill = async (selector, value) => { const f = page.locator(selector); if ((await f.count()) && !(await f.inputValue())) await f.fill(value); };
  await fill('input[name="phone"]', phone());
  await fill('input[name="name"]', locale === "ar" ? "منى سالم" : "Mona Salem");
  const delivery = page.locator('input[name="mode"][value="DELIVERY"]');
  if (await delivery.count()) await delivery.check();
  else if (await page.locator('input[name="mode"]').count()) await page.locator('input[name="mode"]').first().check();
  await page.waitForTimeout(300);
  if (await page.locator('select[name="governorate"]').count()) {
    await page.locator('select[name="governorate"]').selectOption({ index: 1 });
    await fill('input[name="city"]', locale === "ar" ? "المعادي" : "Maadi");
    await fill('input[name="addressLine1"]', locale === "ar" ? "٩ شارع ٢٣٣" : "9 Road 233");
  }
  await page.waitForTimeout(2500);
  const methods = await page.locator('input[name="paymentMethod"]').evaluateAll((els) => els.map((e) => e.value));
  const chosen = method && methods.includes(method) ? method : methods[0];
  await page.locator(`input[name="paymentMethod"][value="${chosen}"]`).check();
  await page.locator('input[name="terms"]').check();
  await page.locator('main form button[type="submit"]').click(); // main: the footer now carries a newsletter form too
  await page.waitForURL(/\/orders\//, { timeout: 20000 }).catch(() => {});
  return { methods, chosen };
}
const proofMethod = (methods) => methods.find((m) => m !== "COD");

// ── 3. Guest checkout, both locales ────────────────────────────────────────────────────────────────
let guestTransferOrder = null;
let guestCodOrder = null;
for (const [locale, width, preferProof] of [["ar", 390, false], ["en", 1280, true]]) {
  const J = `guest checkout ${locale}`;
  const { ctx, page, errors, net } = await context(width);
  await page.goto(`${base}/${locale}`, { waitUntil: "domcontentloaded" });
  // Above the minimum, if the store has one: the funnel is about the happy path.
  await addLine(page, store.purchasable[0], manifest?.minimumOrder ? 3 : 1);
  await go(page, `${base}/${locale}/checkout`);
  const guestForm = (await page.locator('input[name="phone"]').count()) > 0;
  if (manifest) check(J, guestForm === manifest.guestCheckout, `guest checkout is ${manifest.guestCheckout ? "offered" : "withheld"}, as configured`);
  if (!guestForm) {
    const placed = await page.evaluate(async () => (await fetch("/api/session/orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ paymentMethod: "COD", termsVersionAccepted: 1, guestContact: { name: "x", phone: "01000000000" } }) })).status);
    check(J, placed === 401, `a guest order is refused by the server too (${placed}), not merely hidden`);
    check(J, (await page.getByRole("link", { name: locale === "ar" ? /تسجيل الدخول/ : /Sign in/ }).count()) > 0, "checkout points the guest to sign in");
    await ctx.close();
    continue;
  }
  const methodsShown = await page.locator('input[name="paymentMethod"]').evaluateAll((els) => els.map((e) => e.value)).catch(() => []);
  const { methods, chosen } = await fillCheckout(page, locale, preferProof ? proofMethod(methodsShown) : "COD");
  if (manifest) check(J, JSON.stringify([...methods].sort()) === JSON.stringify([...manifest.paymentMethods].sort()), `payment methods offered are exactly the configured ones (${methods.join(", ")})`);
  const url = page.url();
  check(J, /\/orders\/ORD-\d+/.test(url), `order placed with ${chosen} → ${url.replace(/t=[^&]+/, "t=<token>")}`);
  check(J, /[?&]t=[A-Za-z0-9_-]{20,}/.test(url), "the guest received a tracking link with an access token");
  check(J, net.filter((n) => n.startsWith("POST /api/session/orders")).length === 1, "exactly one placement request");
  check(J, errors.length === 0, `no page errors ${errors.length ? JSON.stringify(errors) : ""}`);
  if (chosen === "COD") guestCodOrder = url; else guestTransferOrder = url;
  await ctx.close();
}

// ── 4. Payment instructions and tracking ───────────────────────────────────────────────────────────
// Reused for a signed-in transfer order when the store does not take guest orders.
async function paymentJourney(orderUrl, ctxOverride) {
  const J = "payment instructions";
  const { ctx, page } = ctxOverride ?? (await context());
  await go(page, orderUrl.replace("placed=1&", "").replace("/ar/", "/en/"));
  check(J, (await page.getByText("Complete your payment").count()) === 1, "a transfer order asks for payment");
  const destination = (await page.locator("section dl").last().textContent())?.replace(/\s+/g, " ").trim() ?? "";
  check(J, destination.length > 5, `the snapshotted destination is shown: "${destination.slice(0, 80)}"`);
  // ── 5. Receipt upload ──
  await page.locator('input[type="file"]').setInputFiles(image);
  await page.waitForTimeout(4000);
  if ((await page.getByText("We've received your receipt").count()) === 1) check("payment proof", true, "receipt uploaded, payment under review");
  else if ((await page.getByText("We couldn't upload the receipt").count()) > 0) blocked("payment proof", "the backend's private file store (Cloudinary) is not configured here — the UI reported the failure correctly");
  else check("payment proof", false, "neither success nor a handled failure was shown");
  if (!ctxOverride) await ctx.close();
}
if (guestTransferOrder) await paymentJourney(guestTransferOrder);

const trackingUrl = guestCodOrder ?? guestTransferOrder;
if (trackingUrl) {
  const J = "order tracking";
  for (const locale of ["ar", "en"]) {
    const { ctx, page } = await context();
    await go(page, trackingUrl.replace(/\/(ar|en)\//, `/${locale}/`));
    check(J, (await page.getByText(/ORD-\d+/).count()) > 0, `${locale}: the token link shows the order`);
    check(J, (await page.evaluate(() => document.querySelector('meta[name="referrer"]')?.getAttribute("content"))) === "no-referrer", `${locale}: the tracking page sends no referrer`);
    await ctx.close();
    const fresh = await context();
    await go(fresh.page, trackingUrl.replace(/[?&]t=[^&]+/, "").replace(/\/(ar|en)\//, `/${locale}/`));
    check(J, (await fresh.page.getByText(locale === "ar" ? "لم نجد هذا الطلب" : "couldn't find this order").count()) > 0, `${locale}: without the token the same order is not found`);
    await fresh.ctx.close();
  }
  // ── 6. Cancellation within the window ──
  const { ctx, page } = await context();
  await go(page, trackingUrl.replace("placed=1&", "").replace("/ar/", "/en/"));
  const cancel = page.getByRole("button", { name: "Cancel order" });
  if (await cancel.count()) {
    await cancel.click();
    await page.getByRole("button", { name: "Yes, cancel it" }).click();
    await page.waitForTimeout(2500);
    check("cancellation", (await page.getByText("Cancelled").count()) > 0, "the guest cancelled within the window and the order shows Cancelled");
  } else check("cancellation", false, "a just-placed order offers no cancellation");
  await ctx.close();
} else blocked("guest order tracking", "no guest order was placed (guest checkout is off for this store) — the signed-in journey covers tracking instead");

// ── 7. Account: sign up with a guest cart (merge), signed-in checkout, logout, login ───────────────
let customerOrder = null;
{
  const J = "signed-in checkout";
  const { ctx, page, errors } = await context();
  const customerPhone = phone();
  const password = `funnel-${Date.now()}`;
  await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
  await addLine(page, store.purchasable[0], manifest?.minimumOrder ? 3 : 2);
  await go(page, `${base}/en/signup?redirectTo=/en/cart`);
  await page.locator('input[name="name"]').fill("Funnel Customer");
  await page.locator('input[name="phone"]').fill(customerPhone);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Create an account" }).click();
  // Signup never signs in (it must not reveal whether the number was registered): it hands over to login.
  await page.waitForURL((u) => new URL(u).pathname === "/en/login", { timeout: 15000 }).catch(() => {});
  check("signup privacy", new URL(page.url()).pathname === "/en/login" && !page.url().includes(customerPhone.slice(3)), "signup hands over to sign-in, with the phone kept out of the URL");
  // The form fills the phone after hydration (from sessionStorage, never the URL), so wait for it rather than read it instantly.
  const prefilled = await page.waitForFunction((phone) => document.querySelector('input[name="phone"]')?.value === phone, customerPhone, { timeout: 5000 }).then(() => true, () => false);
  check("signup privacy", prefilled, `the phone is prefilled on the sign-in form (saw "${await page.locator('input[name="phone"]').inputValue()}")`);
  check("signup privacy", !(await ctx.cookies()).some((c) => c.name === "sf_session" && c.value), "signing up creates no session");
  const repeat = await page.evaluate(async (phone) => {
    const signup = () => fetch("/api/session/auth/signup", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ name: "Someone Else", phone, password: "another-password-1" }) });
    const taken = await signup();
    const fresh = await fetch("/api/session/auth/signup", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ name: "New Person", phone: `0109${String(Date.now()).slice(-7)}`, password: "another-password-1" }) });
    return { taken: [taken.status, await taken.text()], fresh: [fresh.status, await fresh.text()] };
  }, customerPhone);
  check("signup privacy", JSON.stringify(repeat.taken) === JSON.stringify(repeat.fresh), `a registered and an unregistered number get the same answer (${repeat.taken.join(" ")})`);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => new URL(u).pathname === "/en/cart", { timeout: 15000 }).catch(() => {});
  check("signup privacy", new URL(page.url()).pathname === "/en/cart", "signing in after signup returns to the requested page");
  const lines = await page.evaluate(async () => (await (await fetch("/api/session/cart")).json()).lines?.length ?? -1);
  check("cart merge", lines === 1, "on sign-in the guest's line is in the new customer's cart");
  const cookies = await ctx.cookies();
  check("cart merge", !cookies.some((c) => c.name === "sf_cart" && c.value), "the guest cart token is gone after the merge");
  check("session", cookies.some((c) => c.name === "sf_session" && c.httpOnly) && cookies.some((c) => c.name === "sf_refresh" && c.httpOnly && c.path === "/api/session/auth"), "session cookies are httpOnly; refresh is scoped to /api/session/auth");
  await go(page, `${base}/en/checkout`);
  const { chosen } = await fillCheckout(page, "en", "COD");
  customerOrder = page.url().match(/ORD-\d+/)?.[0] ?? null;
  check(J, Boolean(customerOrder), `signed-in order placed with ${chosen}: ${customerOrder}`);
  await go(page, `${base}/en/account/orders`);
  check(J, customerOrder !== null && (await page.getByText(customerOrder).count()) > 0, "the order is listed in the account");
  if (customerOrder && chosen !== "COD" && !guestTransferOrder) await paymentJourney(`${base}/en/account/orders/${customerOrder}`, { ctx, page });
  if (customerOrder) {
    const stranger = await context();
    await go(stranger.page, `${base}/en/orders/${customerOrder}`);
    check("order tracking", (await stranger.page.getByText("couldn't find this order").count()) > 0, "another visitor cannot open the customer's order");
    await stranger.ctx.close();
  }
  await page.evaluate(() => fetch("/api/session/auth/logout", { method: "POST" }));
  const after = await ctx.cookies();
  check("session", !after.some((c) => ["sf_session", "sf_refresh", "sf_marker"].includes(c.name) && c.value), "logout cleared every session cookie");
  await go(page, `${base}/en/login`);
  await page.locator('input[name="phone"]').fill(customerPhone);
  await page.locator('input[name="password"]').fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForTimeout(1500);
  const wrong = await page.locator('main [role="alert"]').textContent();
  await page.locator('input[name="phone"]').fill("01000000000");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForTimeout(1500);
  check("session", wrong === (await page.locator('main [role="alert"]').textContent()), "a wrong password and an unknown phone get the same message");
  if (await settle(page, `${base}/en/login?redirectTo=https://evil.example`, "session")) {
    await page.locator('input[name="phone"]').fill(customerPhone);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForTimeout(2500);
    check("session", page.url().startsWith(`${base}/en`), "a hostile redirectTo stays on the store");
  }
  check(J, errors.length === 0, `no page errors ${errors.length ? JSON.stringify(errors) : ""}`);

  // ── 8. After delivery: return request and review ──
  if (!customerOrder) blocked("returns & reviews", "no signed-in order to deliver");
  else if (!staffCookie) blocked("returns & reviews", "no staff credentials (BACKEND_URL / OWNER_EMAIL / OWNER_PASSWORD) to ship and deliver the order");
  else {
    const list = await (await admin("GET", `/orders?search=${customerOrder}`)).json();
    const id = (list.data ?? list).find?.((o) => o.orderNumber === customerOrder)?._id;
    let refused = null;
    for (const status of ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"]) {
      const r = await admin("PUT", `/orders/${id}/status`, { status });
      if (!r.ok) { refused = `${status} → ${r.status} ${(await r.text()).slice(0, 120)}`; break; }
    }
    if (refused && chosen !== "COD") {
      check("payment safety", /^SHIPPED|^READY_FOR_PICKUP|^DELIVERED/.test(refused) && refused.includes("409"), `an unverified ${chosen} order cannot be shipped: ${refused.slice(0, 90)}`);
      blocked("returns & reviews", `the order can only ship once its receipt is verified, and receipt upload needs Cloudinary here`);
    } else if (refused) check("returns & reviews", false, `a COD order could not be delivered: ${refused}`);
    else {
      await go(page, `${base}/en/account/orders/${customerOrder}`);
      check("returns & reviews", (await page.getByText("Delivered").count()) > 0, "the account shows the order Delivered");
      const result = await page.evaluate(async (orderNumber) => {
        const order = await (await fetch(`/api/session/orders/${orderNumber}`)).json();
        const line = order.lines[0];
        const post = (url, body) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(body) });
        const ret = await post("/api/session/returns", { orderNumber, reason: "Wrong size", lines: [{ orderLineId: line.orderLineId, quantity: 1, reason: "Wrong size", condition: "Unopened" }] });
        const returns = await (await fetch("/api/session/returns")).json();
        const review = await post("/api/session/reviews", { productId: line.productId, rating: 5, title: "Excellent", body: "Exactly as described, well made." });
        return { ret: ret.status, listed: JSON.stringify(returns).includes(orderNumber), review: review.status };
      }, customerOrder);
      check("returns & reviews", result.ret === 201 && result.listed, `return requested (${result.ret}) and listed in the account`);
      check("returns & reviews", result.review === 201, `review submitted for moderation (${result.review})`);
    }
  }
  await ctx.close();
}

await browser.close();
const count = (state) => results.filter((r) => r.state === state).length;
console.log(`\nfunnel: ${count("PASS")} passed, ${count("FAIL")} failed, ${count("BLOCKED")} blocked.`);
for (const journey of [...new Set(results.filter((r) => r.state === "BLOCKED").map((r) => r.journey))]) console.log(`  blocked: ${journey}`);
process.exit(count("FAIL") ? 1 : 0);
