# Deployment — storefront

> **Status: prepared, never performed.** Nothing described here has been deployed. No account, project, domain
> or credential was created, and no value below is real. The owner creates the services and fills in the secrets.
> The app refuses to build or boot in production when a required variable is missing or unusable (names printed,
> values never). The backend's counterpart is `../../mimora-staff/docs/deployment.md`; read both — the two
> services are deployed as a pair. What can only be verified once deployed is listed at the end.

The storefront is a Next.js application that holds **no secret except one** (`REVALIDATE_SECRET`) and no database.
It reads the catalog server-side from the backend (`STAFF_API_URL`, **server-only**), and every cart, checkout and
account call goes through this app's own `/api/session/**` route handlers, which forward server-to-server. The browser
talks only to this origin and never learns the backend's address.

## Host-agnostic by design

Vercel is the documented primary target; `npm ci && npm run build && npm run start` runs it on any Node host.
There is no scheduled job here and no database. Elsewhere you only need: Node, TLS in front (cookies are `Secure`
outside development), the environment variables below, and a network path to the backend. Set `TRUST_X_REAL_IP=1`
**only** if your proxy overwrites `X-Real-IP`.

## Build and runtime

| | |
|---|---|
| Node | **24.x** (what CI runs; Next 16 needs at least 20.9). Set it in Vercel's Project Settings. |
| Install | `npm ci` |
| Build | `npm run build`. It first runs `verify-design-tokens` (`prebuild`), which fails on a brand literal in source. **Needs `SITE_URL`** — the production build throws without it. Needs **no** backend and no `STAFF_API_URL`. |
| Start | `npm run start` (Vercel runs its own server). |
| `vercel.json` | `{ "framework": "nextjs" }`. No crons, rewrites or headers. |

**Private packages.** `@kira-joo/*` comes from GitHub Packages, not public npm, so install needs a read credential.
CI writes an `.npmrc` at job time from a `PACKAGES_READ_TOKEN` secret (`.github/workflows/verify.yml`); there is
**no auth line in any tracked file**. On Vercel, supply the credential the way Vercel documents for private
registries (an `NPM_RC` variable holding `@kira-joo:registry=https://npm.pkg.github.com` and
`//npm.pkg.github.com/:_authToken=<a read:packages token>`; confirm the mechanism in Vercel's current docs).
Never commit the token.

## Environment variables

Declared once in `src/lib/config/env-validation.ts`; explained in `configuration.md`; the reviewed template is
`docs/env-example.txt` — install it with `sed '3,6d' docs/env-example.txt > .env.example` (tooling here may not write `.env*`
paths). Every variable is tagged **[per store]**, **[per environment]**, **[pair]** or **[secret]**.
None is `NEXT_PUBLIC_`; the boot gate reports a `NEXT_PUBLIC_` look-alike of the backend's address.

| Variable | Tier | Secret | Set it to |
|---|---|---|---|
| `STAFF_API_URL` | required | no | The backend's origin, e.g. `https://api.example.com` (placeholder). **Server-only.** |
| `SITE_URL` | required | no | This storefront's public origin, `https://shop.example.com` (placeholder). **Throws at production build** if missing, malformed, or not https (a loopback origin — `localhost`, `127.0.0.1` — is exempt, for local production runs). |
| `STORE_ID` | required | no | This deployment's store id, a lowercase slug (`^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$`), **equal to the backend's `STORE_ID`**. The storefront verifies it against the backend's `GET /api/storefront/identity` (see below). **Boot** refuses to start without it; the build does not need it. |
| `STORE_TIMEZONE` | required | no | IANA zone, equal to the backend's. |
| `REVALIDATE_SECRET` | capability | **yes** | `openssl rand -base64 48`, equal to the backend's. Unset: invalidation is OFF (announced). |
| `TRUST_X_REAL_IP` | optional | no | `1` only behind a proxy that overwrites `X-Real-IP`. |

`NODE_ENV` and `NEXT_PHASE` are set by Next. **Previews are production-mode builds**: the same gate applies, so
give each preview a `SITE_URL` (its own https origin) and point `STAFF_API_URL` at a **non-production** backend.

### Which backend is this? (store identity)

One deployment serves one store, and each storefront talks to exactly one backend. Nothing in a URL proves the
backend is the intended store's, so both services carry the same `STORE_ID` and the storefront checks it:

- The backend adopts its identity once, out of band (`node scripts/admin/adopt-store-identity.mjs --store-id <id>
  --confirm-db <db>` from the backend checkout, with `MONGODB_URI` and `MONGODB_DB`; see the backend's deployment doc),
  verifies its database marker at boot, and only then answers `GET {STAFF_API_URL}/api/storefront/identity` →
  `{ "storeId": "<id>" }` (public, uncached).
- **Before every backend call** the storefront (`src/lib/config/backend-identity.ts`, called from
  `storefront-client.ts` for catalog reads and `shop-request.ts` for cart, checkout and account) compares that answer
  with its own `STORE_ID`. Nothing is sent to, and nothing is used from, a backend that has not answered as this store.
  Success is remembered for the life of the process, so it costs one request per instance; failure is never remembered.
- **Mismatch** (`this storefront is configured as store 'a' but STAFF_API_URL answers as store 'b'`): every read and
  every BFF call is refused (catalog pages show their absent state, `/api/session/**` answers `503`, no cookie or cart
  token is forwarded), and a loud `[identity]` error is logged once per distinct answer. Fix `STORE_ID` or `STAFF_API_URL`.
- **Backend unreachable, or the identity endpoint answers non-2xx** (including a backend that predates the endpoint):
  treated as the backend being down: absent states and `503`, retried on the next request. The boot does **not** crash
  for it; it logs one `[identity]` warning and verifies again on the first request.
- Outside production with `STORE_ID` unset, verification is skipped with a one-time `[identity]` warning, so local
  development and tests keep working. In production it is required.

### What fails where

- **Build** (`next build`): only `SITE_URL`. `STORE_ID` is not checked at build; with the backend reachable the build
  verifies identity like any request (a mismatch or a missing `STORE_ID` makes the catalog reads degrade to their absent
  state and logs an `[identity]` error), and with it unreachable the build still succeeds (D-15). Verified with a real build: unset → `EnvironmentConfigurationError` from
  `/robots.txt`'s prerender, listing `SITE_URL: is not set`; set → builds. The build does not check `STAFF_API_URL`
  (pages render their absent state when the backend is unreachable at build).
- **Boot** (`register()` in `src/instrumentation.ts`): `STAFF_API_URL`, `SITE_URL`, `STORE_ID`, `STORE_TIMEZONE`; each
  named with the reason (`STORE_ID` also when malformed). Then one attempt to verify the backend's identity: the log
  line is `[identity] verified store 'x'`, or a loud error on a mismatch, or a warning when the backend is unreachable.
  None of the identity outcomes stops the boot. `REVALIDATE_SECRET` absent is announced, not fatal.

## Origins, cookies, CORS

- **No CORS** — the browser never calls the backend. There is nothing to allow-list.
- The session cookies (`sf_session`, `sf_refresh`, `sf_marker`, `sf_cart`) are set by this app's route handlers,
  **host-only** (no `Domain`), `HttpOnly`, `SameSite=Lax`, `Secure` whenever `NODE_ENV` is not `development`. The
  refresh cookie is scoped to `/api/session/auth`. They are separate from the backend's own cookies on the backend's
  origin; the two never mix, even on sibling subdomains. **Do not add a `Domain`.**
- Because they are `Secure`, **http works only on `localhost`.**
- **Email links** (`verify-email`, `reset-password`, `newsletter/confirm`) are `GET` navigations from another site;
  `SameSite=Lax` is enough, and each page works signed in or out. The pages send no referrer, so the token in the
  URL does not leak onward.

## Cache invalidation (the pair)

| Backend | This storefront |
|---|---|
| `STOREFRONT_REVALIDATE_URL=https://shop.example.com/api/revalidate` | route `/api/revalidate` (exists) |
| `REVALIDATE_SECRET=<S>` | `REVALIDATE_SECRET=<S>` |

The receiver answers `404` to a missing or wrong secret, by design, and honours only this app's known cache tags.
If Vercel **Deployment Protection** covers the deployment, the backend's request is stopped earlier — production is
unprotected by default, previews are not. Catalog pages are ISR with a 300 s safety net, so even a broken pairing
degrades to "prices lag up to five minutes", never to "wrong forever"; cart, quote, checkout and stock are never cached.

## Images and email

Merchant images are served from `res.cloudinary.com` (`next.config.ts` → `images.remotePatterns`); the backend's
Cloudinary setup is `../../docs/store/phases/07-cloudinary-isolation-plan.md`. The storefront sends no email — the
backend does (SMTP and DNS: `../../docs/store/phases/07-email-provider-research.md`). Links in those emails point
here, built from the **backend's** `STOREFRONT_URL`, which must therefore equal this app's `SITE_URL`.

## Client IP

This app forwards the right-most `X-Forwarded-For` entry it sees (or `X-Real-IP` with `TRUST_X_REAL_IP=1`) to the
backend for its per-address rate limits. **Vercel overwrites `X-Forwarded-For` on requests to the backend**, so the
address this app forwards is probably replaced, and per-address limits would pool every customer into one bucket
(stricter, never looser). **Not verified deployed** — see the backend's deployment doc for the measurement.

## First-deploy checklist

Every step is an external action for the owner; none has been done.

1. Deploy the backend first (`../../mimora-staff/docs/deployment.md`): database, secrets, first Owner, and its
   `STORE_ID` with the one-time identity adoption for its database.
2. Create the Vercel project from this repository (framework Next.js, Node 24); add the private-registry credential.
3. Set `STAFF_API_URL`, `SITE_URL`, `STORE_ID` (the same value the backend has), `STORE_TIMEZONE`, `REVALIDATE_SECRET`
   (the same value the backend has) for Production.
   Preview: its own `SITE_URL`, a non-production `STAFF_API_URL`.
4. Attach the domain; let TLS provision. `SITE_URL` must be that exact https origin.
5. Deploy. A missing required variable fails the build (`SITE_URL`) or the boot (the others) with its name. Check the
   boot log for `[identity] verified store '<STORE_ID>'`; a mismatch line means `STORE_ID` or `STAFF_API_URL` is wrong.
6. Back on the backend, set `STOREFRONT_REVALIDATE_URL` and `STOREFRONT_URL` to this origin, and redeploy it.
7. In the console, publish a store profile, catalog and the pages the footer links to; the storefront has no content
   of its own (the merchant is content, not code).

## Post-deploy smoke checklist

Replace `shop.example.com` with the real origin. Tick each; record what was seen.

- [ ] `curl -sI https://shop.example.com/ar` → `200`; `/en` too. `curl -s https://shop.example.com/robots.txt` names the sitemap; `/sitemap.xml` is not empty.
- [ ] The page source contains no backend address: `curl -s https://shop.example.com/ar | grep -c api.example.com` → `0`.
- [ ] The backend answers as this store: `curl -s https://api.example.com/api/storefront/identity` → `{"storeId":"<STORE_ID>"}`, equal to this deployment's `STORE_ID`. Boot log: `[identity] verified store '<STORE_ID>'`, and no `[identity]` error line.
- [ ] Boot log: no `[config]` line (a `REVALIDATE_SECRET` OFF line means the pairing is not set).
- [ ] `curl -i -X POST https://shop.example.com/api/revalidate` → `404` (no secret). After a console price edit, the product page updates within seconds.
- [ ] Browse, add to cart, check out as a guest on each enabled payment method; the cart survives a reload (`sf_cart`).
- [ ] Sign up, sign in, sign out; cookies are `Secure; HttpOnly; SameSite=Lax`, and the refresh cookie appears only under `/api/session/auth`.
- [ ] Stop the backend (or point `STAFF_API_URL` at nothing in a preview): the storefront shows its explicit unavailable state, not a blank page or a stack trace; restart it and the site recovers without a redeploy.
- [ ] Footer newsletter: the form says to check the inbox (never "you're subscribed"); the emailed link opens `/ar/newsletter/confirm?token=…` and confirms.
- [ ] RTL and light/dark render on a real phone, not only in a desktop browser.

## Not verified (because it can only be verified deployed)

- The private-registry install on Vercel.
- Cookie `Secure`/`SameSite` and the refresh path scoping across the real pair of domains.
- The backend's request reaching `/api/revalidate` through Vercel's protection layer.
- Whether the forwarded client address survives Vercel's proxy (expected: it does not).
- Behaviour when the backend is slow or restarting, rather than simply down. (Reachable-but-wrong is the identity check above; it is covered by unit tests and the CI storefront proof, not by a deployed run.)
- That the identity check leaves the ISR catalog pages static in a deployed build: it deliberately calls Next's unpatched fetch (a `no-store` call through the patched one would mark a static render dynamic). Confirm with `x-nextjs-cache: HIT` on a catalog page after deploy.
