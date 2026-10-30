# mimora-client — Mimora storefront

Mimora's customer-facing online store — a gift boutique serving Egypt. This file
is the working contract for this repository. Authoritative detail lives in
`docs/MDS.md` (inherited from the template: where it describes a reusable
multi-merchant platform, this file wins). This stays short and states only what
must never be got wrong.

## Repository model — one brand, one repository pair, one deployment

- **This repository is Mimora's, and only Mimora's.** It serves exactly one
  store, verified at boot: `STORE_ID=mimora` must equal the id the backend
  (`mimora-staff`) reports from its own database, or the storefront refuses to
  talk to it. There is no tenant switching, and none may be added.
- **It was created from the reusable template** `store-platform@1915687`. The
  template is a source, never a dependency: nothing here may import, read, build
  from or check out `store-platform*`. A template improvement reaches Mimora only
  by being ported here deliberately, and Mimora-specific work never flows back.
- **A future brand gets its own repository pair and deployment** — never a
  second store inside this one.

## What this application is

Mimora's online store: **discover → browse and filter → product → variant
selection → cart → checkout → pay → order → track → account**. It is a commerce
funnel, not a content site.

**Mimora's visual identity is implemented here, in code**: layout, typography,
colour tokens, ornaments (hearts, ribbons, gingham), motion and the brand assets
under `public/brand/mimora/`. There is no theme or style selector, and the
backend holds no design settings beyond the store profile it already has.

**Store data stays data.** Catalog, categories, collections, products, prices,
stock, images of products, announcement, navigation, home-section content,
contact details, zones, payment methods and business settings are managed in
`mimora-staff` and read from it. Never hardcode a product, price, stock level or
any other value the content model holds into a component.

## Sibling repositories

This repo sits beside independent sibling repositories, including its backoffice
and backend (`mimora-staff`) and a set of shared `@kira-joo/*` packages published
to GitHub Packages — the only intentional shared code. There is no monorepo
tooling, no shared lockfile, and no root `package.json`.

**Never work from a remembered list of packages or versions — derive them:**

```bash
ls -d ../*/ | sed 's|../||;s|/||'     # sibling repositories
grep -h '"name"' ../*/package.json     # package names
```

A snapshot table in an instruction file decays and then misleads.

## Stack

Next 16 (App Router, Turbopack) · React 19 · TypeScript strict · Tailwind 4 ·
React Query · react-hook-form · Axios · next-intl · Motion.

**Target Tailwind 4.** `@kira-joo/frontend-toolkit-tailwind@1.0.0` declares
`tailwindcss: "^3.4.0 || ^4.0.0"` as a peer and ships a real, tested v4
`@theme`/`@source` contract (`theme.css`), alongside the v3 JS preset kept for
one release. Every actual consumer in the workspace — `restaurant-platform`,
`restaurant-platform-staff`, `nutrition-client`, `nutrition-staff`, `portfolio`
— is on `tailwindcss ^4.3.3`; none remain on 3. There is no v3 pattern left
worth copying: `globals.css` imports `"tailwindcss"` and
`"@kira-joo/frontend-toolkit-tailwind/theme.css"`, app-specific tokens live in
a `@theme inline` block, and there is no `tailwind.config.ts`.

**`middleware.ts` does not exist in Next 16** — it is `src/proxy.ts`.

## Authentication

The workspace-wide contract is `../docs/authentication-architecture.md`. Read it
before touching anything in the auth path. **Note:** its §9 describes cart,
checkout and orders going direct from the browser to the backend. They do not,
and cannot — see non-negotiable 5 and `../docs/store/02-restaurant-pair-audit.md` §4.

## Non-negotiables

1. **Design values are tokens; store data is not source.** Colours, durations
   and easings live only in `src/styles/tokens.css`; `predev`/`prebuild`
   (`scripts/verify-design-tokens.mjs`) fails the build on a literal elsewhere,
   and on any CI-fixture merchant identity (`scripts/brand-strings.json`) leaking
   into `src/`. Phone numbers, social URLs, product data and other store data come
   from the backend, never from source. UI chrome copy lives in the next-intl
   message files. If a literal is genuinely correct, add a reviewed exemption
   stating why — never delete the rule.
2. **Money is never a float.** `Money` is `Decimal` in major units. Currency is
   not part of an amount — format through `moneyView(currency, locale)`.
3. **This app never computes a price, fee, tax, discount, or promised date.** It
   sends product ids, variant ids and quantities; the backend prices the order
   and returns the authoritative answer. A client-side total that disagrees with
   the server is a dispute.
4. **Transactional data is never cached — and stock is transactional.** Cart,
   quote, checkout, orders, payment state, **stock** and shipping availability
   are `no-store`, always. Catalog content is ISR with cache tags. A cached "in
   stock" badge sells something that is gone.
5. **The browser never learns the backend's origin — any of it.** Catalog reads
   happen in Server Components against `STAFF_API_URL` (server-only); mutations
   go through this app's own route handlers, which forward server-to-server.
   There is no browser-to-backend client, because there cannot be one: the shop
   surface authenticates by the backend's own httpOnly customer cookies, set on
   ITS origin; this app holds their values in its own httpOnly cookies and
   forwards them server-to-server. The browser talks only to this origin.
   *(Corrected 2026-10-20 — this said `Authorization: Bearer`; the backend has
   no Bearer support.)*
6. **Sessions are httpOnly cookies**, set by this app's own route handlers. No
   token ever touches JavaScript or `localStorage`.
7. **Guest checkout is first-class.** Authentication never blocks the funnel.
8. **Every order-placing or money-moving request carries an `Idempotency-Key`.**
9. **A variant owns its price and its stock.** There is no base price plus a
   delta. A cart line carries a stable `lineId` and merges on `variantId`.
10. **Availability is an existential question, never a per-axis one.** "M
    exists" and "red exists" does not mean "M in red exists". A selection that
    becomes unavailable is shown as unavailable and must be replaced — the
    customer is **never** silently switched to a different variant.
11. **RTL, both grounds, and reduced-motion correctness are requirements, not
    polish.** Arabic is the default locale. Light and dark are both first-class.
    Every layout is verified in all four combinations.
12. **No package or toolkit architecture is visible in customer-facing UI.**

## Data and API layer

- **One `Endpoint` contract, two transports.** Server-side reads use the `fetch`
  adapter so they participate in Next's Data Cache (`next: {revalidate, tags}`);
  browser-side calls use the Axios adapter for interceptors, cancellation, retry
  and refresh-on-401. **Axios cannot participate in the Data Cache** — routing a
  catalog read through it silently loses ISR, and the first sign is a database
  under load.
- **No API path is hardcoded at a call site.** One `*.endpoints.ts` per domain
  plus a route-constant module.
- **A base URL owns the shared prefix; a route constant owns only the resource
  path.** Join with `joinUrl`, never `new URL(path, base)` — the latter silently
  drops the base's own path segment.
- **Import server-safe code from `@kira-joo/frontend-toolkit-core/server`.** The
  root entry bundles React-context modules; importing *anything* from it inside a
  Server Component or Route Handler crashes the build with
  `TypeError: createContext is not a function`.
- **Errors use one shape.** Normalise with the toolkit's helpers; never invent a
  second error model. Validation errors map to form fields — a checkout that says
  only "Validation failed" is a defect.

## UI

- **This app has its own design system**, and it borrows nothing from the
  backoffice. It consumes `@kira-joo/frontend-toolkit-tailwind` **sparingly** —
  `cn`, validation helpers, possibly the dialog stack. `FeatureTable`, `SideNav`,
  `PageShell` and the charts are admin furniture and do not belong here.
- **Import from subpath entry points, never the root barrel.**
- **Server Components by default.** `"use client"` only where interaction
  requires it.
- **Two grounds, one geometry.** Light and dark differ in colour, scrim and
  elevation only. Type, spacing, radius and every duration are declared once and
  never per ground: **the flip must not move a single pixel.**
- **Theme resolution is a CSS concern, never a JavaScript one.** No Server
  Component branches on theme. The system preference is honoured in CSS so the
  page stays static; only an explicit stored choice is applied by script, before
  first paint.
- **Motion, imported as `motion/react`.** Never `framer-motion`, never GSAP,
  never a second animation engine. Prefer CSS transitions where they suffice.
  Motion never delays an action.
- **Durations and easing come from tokens.** No literals.
- **next-intl for UI chrome; `resolveLocalized` for store content.** Two systems,
  never routed through each other.

## Verification

Run real servers, exercise real endpoints, measure in a real browser. Reasoning
from source is not verification. When something genuinely cannot be verified that
way, say so precisely and state what was verified instead.

- Browser QA at **375 / 768 / 1024 / 1440**, in **both `ar` and `en`**, on
  **both grounds** — four combinations, not one.
- No horizontal page scroll at any width, in either direction.
- Contrast gates run on both grounds. A failure in dark/`ar` fails as loudly as
  one in light/`en`.
- Automated accessibility pass on every route; keyboard traversal of the funnel.
- **The CI storefront proof** (`scripts/ci/configuration-proof.sh`, run in CI):
  the full funnel, accessibility and viewport gates run against a production
  build seeded with a **fictional CI fixture shop** — never Mimora's catalog —
  in a throwaway `store-fixture-*` database, under **two settings profiles**
  (`ci-default`, `ci-alternate`). The profiles cover the capability states the
  owner can switch in `mimora-staff`: guest checkout on and off (refused by the
  server, not merely hidden), COD and transfer-with-receipt payments, pickup,
  minimum order, flat and per-zone fees, tax added and included, light and dark
  default ground. It is not a multi-store feature.

## Testing floor

This product takes money. Required, not aspirational:

- Unit: every pure function — money formatting, cart-line matching, variant
  matrix resolution, validation schemas.
- Component: every state of every checkout and auth component, including error
  and loading, and **every fulfilment-capability combination including the
  degenerate one** (nothing enabled) — no dead UI, no empty scaffolding.
- Integration: cart merge on sign-in, checkout with mapped server validation
  errors, session refresh mid-request, optimistic rollback.
- E2E: the full funnel in both locales and both grounds, all three payment
  methods, plus guest checkout, out-of-stock recovery, zone-not-served, and proof
  rejection recovery.

## Git

- Work on `staging`, branched from this repo's default branch.
- **Never merge to the default branch** — that is the owner's decision.
- Never rewrite history or force push.
- Never commit `.env*`, a tarball dependency path, or a lockfile pointing at a
  local file.
- Inspect `git status` before any branch-switching or destructive operation;
  other sessions may share this working tree.
- **Never commit or push unless explicitly asked.**

## Autonomy

Investigate, decide, implement, verify, then summarise. Proceed without asking on
bug fixes, refactors, tests, type and lint fixes, accessibility and responsive
fixes, state handling, and running builds or servers.

Ask first for: destructive data operations, irreversible migrations, breaking a
package contract when an alternative exists, scope expansion beyond the request,
deployment, package publication, and decisions that are genuinely product or
business choices rather than implementation ones.
