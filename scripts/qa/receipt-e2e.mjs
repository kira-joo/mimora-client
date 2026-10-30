// Receipt upload, end to end, against REAL Cloudinary credentials (no mock anywhere): a customer
// uploads through the storefront UI, the file is stored PRIVATELY and tied to its order, staff open it
// through the authorised queue's short-lived signed link, verify one order and reject another, and
// every refusal case is exercised. PASS / FAIL / BLOCKED per check; exits 1 on any FAIL.
//
// Needs: the backend running WITH CLOUDINARY_* set (it refuses with 503 otherwise — reported as
// BLOCKED, never as a pass), the storefront in front of it, a store offering a proof-required method
// to guests (the ci-default fixture profile: WALLET / INSTAPAY), and staff access:
//   STOREFRONT_URL (default http://localhost:3030)  BACKEND_URL (default http://localhost:3040)
//   OWNER_EMAIL, OWNER_PASSWORD
//   WAIT_FOR_EXPIRY=1   also waits out the 5-minute signed-link lifetime and checks the link dies.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { addLine, discover, launch } from "./lib.mjs";

const base = (process.env.STOREFRONT_URL ?? "http://localhost:3030").replace(/\/$/, "");
const backend = (process.env.BACKEND_URL ?? "http://localhost:3040").replace(/\/$/, "");
const receipt = fileURLToPath(new URL("./fixtures/receipt.jpg", import.meta.url));
const results = [];
const report = (state, check, detail) => { results.push(state); console.log(`${state.padEnd(7)} ${check}: ${detail}`); };
const check = (name, ok, detail) => report(ok ? "PASS" : "FAIL", name, detail);

// ── staff session (the real login) ───────────────────────────────────────────────────────────────
const login = await fetch(`${backend}/api/admin/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: process.env.OWNER_EMAIL, password: process.env.OWNER_PASSWORD }) });
if (!login.ok) { console.log(`staff login failed (${login.status}) — set OWNER_EMAIL / OWNER_PASSWORD`); process.exit(1); }
const staff = login.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
// Admin money-moving writes require an Idempotency-Key; a fresh one per call, as the console sends one per action.
const admin = (method, path, body) =>
  fetch(`${backend}/api/admin${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: staff, ...(method === "GET" ? {} : { "Idempotency-Key": crypto.randomUUID() }) },
    body: body && JSON.stringify(body),
  });

const store = await discover();
const browser = await launch();

async function guestOrder() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/en`, { waitUntil: "load" });
  await addLine(page, store.purchasable[0]);
  await page.goto(`${base}/en/checkout`, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const fill = async (sel, v) => { const f = page.locator(sel); if (await f.count()) await f.fill(v); };
  await fill('input[name="phone"]', `010${String(Date.now()).slice(-8)}`);
  await fill('input[name="name"]', "Receipt Tester");
  if (await page.locator('input[name="mode"][value="DELIVERY"]').count()) await page.locator('input[name="mode"][value="DELIVERY"]').check();
  if (await page.locator('select[name="governorate"]').count()) {
    await page.locator('select[name="governorate"]').selectOption({ index: 1 });
    await fill('input[name="city"]', "Maadi");
    await fill('input[name="addressLine1"]', "9 Road 233");
  }
  await page.waitForTimeout(2500);
  const methods = await page.locator('input[name="paymentMethod"]').evaluateAll((els) => els.map((e) => e.value));
  const transfer = methods.find((m) => m !== "COD");
  if (!transfer) { await ctx.close(); return null; }
  await page.locator(`input[name="paymentMethod"][value="${transfer}"]`).check();
  await page.locator('input[name="terms"]').check();
  await page.locator('main form button[type="submit"]').click(); // main: the footer now carries a newsletter form too
  await page.waitForURL(/\/orders\/ORD-/, { timeout: 20000 });
  return { ctx, page, url: page.url().replace("placed=1&", ""), orderNumber: page.url().match(/ORD-\d+/)[0], token: new URL(page.url()).searchParams.get("t"), method: transfer };
}

/** On a failure, say what the page DID show (and keep a screenshot) rather than only that it failed. */
async function pageSummary(page, label) {
  await page.screenshot({ path: `${process.env.TMPDIR ?? "/tmp"}/receipt-e2e-${label}.png`, fullPage: true }).catch(() => {});
  return (await page.locator("main").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 300);
}

const queueEntry = async (orderNumber) => ((await (await admin("GET", "/payments/queue?limit=100")).json()).data ?? []).find((o) => o.orderNumber === orderNumber);
const orderByNumber = async (orderNumber) => ((await (await admin("GET", `/orders?search=${orderNumber}`)).json()).data ?? []).find((o) => o.orderNumber === orderNumber);

// ── 1–5: upload, private storage, staff access, verify ───────────────────────────────────────────
const first = await guestOrder();
if (!first) { report("BLOCKED", "setup", "this store offers no proof-required method to guests"); process.exit(1); }
await first.page.goto(first.url, { waitUntil: "load" });
await first.page.locator('input[type="file"]').setInputFiles(receipt);
await first.page.waitForTimeout(6000);
const uploaded = (await first.page.getByText("We've received your receipt").count()) === 1;
if (!uploaded && (await first.page.getByText("We couldn't upload the receipt").count())) {
  report("BLOCKED", "upload", "the backend refused the upload (503 = Cloudinary not configured) — nothing below can be tested");
  await browser.close();
  process.exit(1);
}
check("upload through the storefront UI", uploaded, `${first.orderNumber} (${first.method}) shows "We've received your receipt"`);

const entry = await queueEntry(first.orderNumber);
check("tied to the right order", Boolean(entry?.proof?.proofId), `the staff queue lists ${first.orderNumber} with proof ${entry?.proof?.proofId ?? "none"}`);
const signed = entry?.proof?.signedUrl ?? "";
const signedFetch = signed ? await fetch(signed) : null;
check("staff open it through the signed link", signedFetch?.ok === true && (signedFetch.headers.get("content-type") ?? "").startsWith("image/"), `GET signed link → ${signedFetch?.status} ${signedFetch?.headers.get("content-type")}`);
const original = readFileSync(receipt);
const served = signedFetch?.ok ? Buffer.from(await signedFetch.arrayBuffer()) : Buffer.alloc(0);
check("the stored file is the uploaded file", served.length > 0 && served.equals(original), `${served.length} bytes served, ${original.length} uploaded`);

// Private: the same asset must NOT be reachable as a public CDN delivery, and a tampered signature must fail.
const cloud = signed.match(/res\.cloudinary\.com\/([^/]+)\//)?.[1] ?? signed.match(/api\.cloudinary\.com\/v1_1\/([^/]+)\//)?.[1];
const publicId = new URL(signed || "http://x").searchParams.get("public_id") ?? "";
if (cloud && publicId) {
  const publicTry = await fetch(`https://res.cloudinary.com/${cloud}/image/upload/${publicId}.jpg`);
  check("stored privately (no public CDN delivery)", publicTry.status >= 400, `public delivery URL → ${publicTry.status}`);
} else report("BLOCKED", "stored privately", `could not derive cloud/public id from the signed link to probe public delivery (${signed.slice(0, 60)}…)`);
if (signed) {
  const tampered = signed.replace(/signature=([0-9a-f])/, (_, c) => `signature=${c === "a" ? "b" : "a"}`);
  const t = await fetch(tampered);
  check("a tampered signed link is refused", !t.ok, `→ ${t.status}`);
}

const firstOrder = await orderByNumber(first.orderNumber);
const verify = await admin("PUT", `/orders/${firstOrder._id}/payment/verify`, {});
const afterVerify = await (await admin("GET", `/orders/${firstOrder._id}`)).json();
check("verify", verify.ok && afterVerify.payment?.status === "VERIFIED", `PUT verify → ${verify.status}; payment ${afterVerify.payment?.status}`);
const ship = [];
for (const status of ["CONFIRMED", "PROCESSING", "SHIPPED"]) ship.push(`${status} ${(await admin("PUT", `/orders/${firstOrder._id}/status`, { status })).status}`);
check("a verified order can now ship", ship.every((s) => s.endsWith("200")), ship.join(", "));
await first.page.goto(first.url, { waitUntil: "load" });
const paid = await first.page.getByText(/Payment confirmed|\bPaid\b/).first().waitFor({ timeout: 8000 }).then(() => true, () => false);
check("the customer sees the payment confirmed", paid, paid ? "order page after verification" : `page shows: ${await pageSummary(first.page, "verified")}`);

// ── 6: rejection, and the customer can try again ─────────────────────────────────────────────────
const second = await guestOrder();
await second.page.goto(second.url, { waitUntil: "load" });
await second.page.locator('input[type="file"]').setInputFiles(receipt);
await second.page.waitForTimeout(6000);
const secondOrder = await orderByNumber(second.orderNumber);
const reject = await admin("PUT", `/orders/${secondOrder._id}/payment/reject`, { reason: "The amount does not match" });
const afterReject = await (await admin("GET", `/orders/${secondOrder._id}`)).json();
check("reject", reject.ok && afterReject.payment?.status === "REJECTED" && afterReject.status === "PLACED", `PUT reject → ${reject.status}; payment ${afterReject.payment?.status}, order ${afterReject.status}`);
const refusedShip = await admin("PUT", `/orders/${secondOrder._id}/status`, { status: "CONFIRMED" });
const refusedShip2 = await admin("PUT", `/orders/${secondOrder._id}/status`, { status: "PROCESSING" });
const refusedShip3 = await admin("PUT", `/orders/${secondOrder._id}/status`, { status: "SHIPPED" });
check("a rejected payment still cannot ship", refusedShip3.status === 409, `CONFIRMED ${refusedShip.status}, PROCESSING ${refusedShip2.status}, SHIPPED ${refusedShip3.status}`);
await second.page.goto(second.url, { waitUntil: "load" });
const reasonShown = await second.page.getByText("The amount does not match").first().waitFor({ timeout: 8000 }).then(() => true, () => false);
check("the customer sees the reason", reasonShown, reasonShown ? "rejection reason on the order page" : `page shows: ${await pageSummary(second.page, "rejected")}`);
await second.page.locator('input[type="file"]').setInputFiles(receipt);
await second.page.waitForTimeout(6000);
check("the customer can upload a new receipt", (await second.page.getByText("We've received your receipt").count()) === 1, "after rejection");

// ── 7: refusals — invalid type, oversized, no token, wrong token — at the BACKEND, not only the BFF ─
const shopUpload = async (orderNumber, token, bytes, type, name) => {
  const form = new FormData();
  form.set("proof", new Blob([bytes], { type }), name);
  const r = await fetch(`${backend}/api/shop/orders/${orderNumber}/payment-proof`, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID(), ...(token ? { "x-order-access-token": token } : {}) }, body: form });
  return r.status;
};
const third = await guestOrder();
check("invalid type is refused by the server", (await shopUpload(third.orderNumber, third.token, Buffer.from("not an image"), "text/plain", "receipt.txt")) === 400, "text/plain");
check("a disguised file is refused by the server", (await shopUpload(third.orderNumber, third.token, Buffer.from("%PDF-1.4 fake"), "image/jpeg", "receipt.jpg")) === 400, "PDF bytes labelled image/jpeg");
check("an oversized file is refused by the server", [400, 413].includes(await shopUpload(third.orderNumber, third.token, Buffer.concat([original, Buffer.alloc(9 * 1024 * 1024)]), "image/jpeg", "big.jpg")), "> 8 MB");
check("no token: refused, indistinguishable from a missing order", (await shopUpload(third.orderNumber, null, original, "image/jpeg", "r.jpg")) === 404, "no x-order-access-token");
check("another order's token: refused", (await shopUpload(third.orderNumber, first.token, original, "image/jpeg", "r.jpg")) === 404, "first order's token on the third order");
const noStaff = await fetch(`${backend}/api/admin/payments/queue`);
check("the receipt queue needs a staff session", noStaff.status === 401, `→ ${noStaff.status}`);

// ── 8: the signed link expires ───────────────────────────────────────────────────────────────────
if (process.env.WAIT_FOR_EXPIRY === "1" && signed) {
  console.log("waiting 5 min 15 s for the signed link to expire…");
  await new Promise((r) => setTimeout(r, 315_000));
  const late = await fetch(signed);
  check("the signed link expires", !late.ok, `after 315 s → ${late.status}`);
} else report("BLOCKED", "signed link expiry", "run with WAIT_FOR_EXPIRY=1 (waits 5 min)");

for (const s of [first, second, third]) await s?.ctx.close();
await browser.close();
const count = (s) => results.filter((r) => r === s).length;
console.log(`\nreceipt e2e: ${count("PASS")} passed, ${count("FAIL")} failed, ${count("BLOCKED")} blocked.`);
process.exit(count("FAIL") ? 1 : 0);
