# `mimora-client` — architecture

**This document covers this repository's internals only.**

> **The cross-repo contract is `../../docs/store/04-cross-repo-architecture.md`,
> and it is authoritative.** API surfaces, the caching boundary, auth boundaries,
> shared domain vocabulary, money rules, transactions and the shared
> non-negotiables live there and are **not restated here.**
>
> That is deliberate. The restaurant pair keeps a `docs/architecture.md` in each
> repo, and the two drifted from each other and from the code — one of them still
> describes a browser-to-backend `shopApi` client that cannot work. **A shared
> contract duplicated in two places becomes two contracts.**

Reading order: workspace `CLAUDE.md` → `04-cross-repo-architecture.md` →
this repo's `CLAUDE.md` → this document → `MDS.md`.

---

## 1. Shape

```
src/
  app/[locale]/            route groups, Server Components by default
  app/api/session/**       this app's OWN route handlers — the BFF boundary
  app/api/revalidate/      the cache-invalidation receiver
  components/              presentation, grouped by surface
  lib/api/                 clients, adapters, endpoint modules
  lib/theme/               ground resolution + brand-to-CSS emission
  styles/tokens.css        the two-ground token layer (authoritative)
  proxy.ts                 Next 16's middleware
scripts/
  verify-design-tokens.mjs   predev/prebuild guard
  qa/                        contrast, rendered contrast, viewports, stability
```

## 2. Rendering

**Server Components by default.** `"use client"` only where interaction requires
it — the variant selector is client; the product page around it is not.

Catalog routes are **ISR with cache tags**, and the parameterised ones
(`products/[slug]`, `categories/[slug]`, …) **must declare
`generateStaticParams`**. Without it they are dynamic *by inheritance* rather
than by choice — which is what happened to the restaurant's category and item
pages — and the ISR story quietly stops being true while the code still looks
like ISR.

Transactional routes are `force-dynamic` and `no-store`. **Stock is
transactional.**

`proxy.ts` gates `/account/**` on **cookie presence only**. Presence is not
authentication and the server re-checks; a UI guard hides UI. It must not read
anything that would make a catalog route dynamic.

## 3. The BFF boundary — this repo's defining structural choice

Everything on the backend's shop surface is reached through **this app's own
route handlers under `/api/session/**`**, which read this app's httpOnly cookies
server-side and forward server-to-server.

There is deliberately **no browser-to-backend client**. The shop surface
authenticates a customer by the backend's OWN httpOnly cookies
(`store_customer_session` / `store_customer_refresh`), set on the backend's
origin — which this origin can neither read nor send. So the BFF
(`src/lib/session/shop-request.ts`) reads the backend's `Set-Cookie` values,
keeps them in this app's own httpOnly cookies (`sf_session`, `sf_refresh` under
`/api/session/auth`, the `sf_marker` "a session exists" flag), and forwards them
as a `Cookie` header. The guest cart token (`x-cart-token`) is kept in the
httpOnly `sf_cart` cookie and stripped from every body before it reaches the
browser. *(Corrected 2026-10-20 — this said `Authorization: Bearer`; the backend
has no Bearer support.)*

Two clients, never three:

| Client | Runs in | Transport | Origin |
|---|---|---|---|
| `storefrontApi` | server only | **fetch** | `STAFF_API_URL` (no `NEXT_PUBLIC_`) |
| `sessionApi` | browser | **Axios** | this origin, cookies |

**`storefrontApi` must stay on `fetch`.** Next's Data Cache is driven by
`fetch(url, { next: { revalidate, tags } })` and is meaningless to any other
transport — routing a catalog read through Axios does not error, it **silently
stops being cached**.

## 4. Theme

`tokens.css` holds `:root` as the light ground and the dark overrides. **Colour,
scrim and elevation are ground-dependent; type, spacing, radius and durations
are declared once.** *The flip must not move a single pixel.*

Ground resolution is **CSS-only** (`MDS.md` §19): the system preference via
`@media (prefers-color-scheme: dark)` guarded by `:root:not([data-ground="light"])`,
and an explicit choice via `[data-ground="dark"|"light"]`. Only the stored
explicit choice is applied by a small blocking script, in try/catch. **No Server
Component branches on theme.**

The merchant's brand arrives from the store profile and is emitted server-side as
CSS custom properties. **Only fills; validated; falling back to the derived
value.** Nothing is read at render time by a component.

## 5. Guards that live here

- `verify-design-tokens.mjs` on `predev`/`prebuild` — hex, **brand string**,
  phone number, social URL. It must catch more than the restaurant's, which
  matches only phone numbers and social URLs.
- The declared-pair contrast gate over `tokens.css`, **both grounds**.
- The rendered-contrast gate walking the real paint stack, **both grounds** —
  necessary because both recorded theming failures passed the declared-pair check.
- Viewport and load-stability checks.
- **All of it in CI**, which neither restaurant repo has.

## 6. `/api/revalidate`

The receiving end of cache invalidation: verify the shared secret in constant
time, revalidate only known tags, reject anything else.

**Its absence was the third silence** in the composition that once left
prerendered pages serving a stale price indefinitely while the cart charged the
new one. It exists from the first cache-tagged read, and a test proves it is
actually reached.

## 7. Rules established while building Phase 6 (2026-10-20)

Each of these was measured, not assumed; the code comment at the named place
carries the evidence.

- **Never render a value imported from a `"use client"` module into a Server
  Component's inline `<script>`.** It is serialised as a client reference
  (`I[module, chunks, "export"]`) and only resolves after that chunk loads, so
  hydration depends on chunk timing. Measured in the (since removed) template design preview: React
  hydration error 418 on 12 of 50 font-delayed loads, 0 of 50 once the text came
  from a plain module (`src/lib/theme/ground-script.ts`).
- **A grid card that must be a `subgrid` is never a size container.**
  `@container` implies layout containment, under which `grid-template-rows:
  subgrid` silently computes to `none`. Put the container on a child
  (`src/components/product/product-card.tsx`).
- **Stock is read live.** Catalog pages are ISR for content and price; the
  variant matrix they carry is provisional. The buy box, Quick Add and the
  card's direct add read `/api/catalog/availability/[slug]` (no-store), and
  low-stock text is shown only from that live read. Add-to-cart re-validates on
  the server regardless.
- **D-15 — no catalog route fails the build when the backend is unreachable.**
  Reads that have a designed absent state go through `orNull()`;
  `generateStaticParams` yields nothing rather than throwing; catalog segments
  carry `revalidate = 300` (= `CATALOG_REVALIDATE_SECONDS`) as a safety net that
  also re-renders a page degraded at build time.
- **Cache tags are the strings the backend EMITS**, not its declared const
  (`src/lib/cache/cache-tag.ts`, pinned by a contract test). The theme save
  publishes `STORE_PROFILE`; there is no `THEME` tag on the wire.
- **Motion durations and curves live in one mirror,** `src/lib/motion/tokens.ts`,
  whose test fails if it drifts from `tokens.css`; components import it.
- **The verified dev topology:** backend on 3040, storefront on 3030,
  `STOREFRONT_REVALIDATE_URL=http://localhost:3030/api/revalidate`, one shared
  `REVALIDATE_SECRET`. A receiver answering 404 means the secrets differ — on
  2026-10-20 that was a stale backend process still holding a previous secret
  after a "restart" that Next had refused (`next dev` will not start a second
  server for the same directory).
- **`SITE_URL`** is required in production for absolute sitemap/robots URLs; it
  announces itself when missing (`src/lib/config/site-origin.ts`).
