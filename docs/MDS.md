# `store-platform` — Storefront MDS

The master specification for the customer-facing storefront. The workspace
`CLAUDE.md` outranks this document; `../docs/store/04-cross-repo-architecture.md`
governs anything that spans the two repositories. This document is authoritative
for everything inside this repo.

**Every unconfirmed line is marked `[ASSUMPTION]` in place.** Where it maps to a
registered decision the reference is given, e.g. `[ASSUMPTION → D-3]`; the
register is `../docs/store/03-decisions-and-assumptions.md`.

**Language:** English throughout — documents, code, comments and commit messages.
(The *product* is bilingual; the *engineering* is English.)

---

## 1. Product vision

A merchant's own online store, and a commerce funnel end to end:

**discover → browse and filter → product → variant selection → cart → checkout
→ pay → order → track → account**

Every architectural choice serves that funnel. It is not a marketplace, not an
aggregator, not a content site, and not a template.

**The merchant is content, not identity.** Store name, logo, imagery, brand
colours, typography choice, copy, catalog, categories, collections, prices,
contact details, social links, shipping zones, pickup locations, operating hours,
payment destinations, **theme configuration** and business settings are all data
fetched from the backend. Changing the data produces a different store on the
same codebase. See §17.

The first merchants sell **apparel** and **tools/hardware**. The codebase is
intended to be sold again, so anything that assumes one merchant's shape is a
defect rather than a shortcut.

---

## 2. Target users

| User | Arrives | Needs |
|---|---|---|
| **The browser** | Social, search | To understand what this store is within one screen |
| **The intent buyer** | Search, a direct link | To find a specific product, in their size, and buy it in minutes |
| **The returning customer** | Direct | Their addresses, their order status, their wishlist |
| **The guest** | Anywhere | To buy without making an account. **Never blocked** |
| **The size-anxious buyer** | A product page | A size guide, real imagery, and a return policy they trust |

`[ASSUMPTION]` mobile-first: the majority of traffic is a phone, in Arabic, over
an unreliable connection. Every decision in this document assumes that until
analytics say otherwise.

---

## 3. Business assumptions

- One deployment per merchant. **No `storeId`, no tenant resolution, no
  row-level scoping.**
- One currency per deployment, carried by the store profile.
- **Arabic is the default locale and RTL is primary**; `en` is also first-class.
- Payments are **Cash on Delivery, Wallet transfer, InstaPay transfer**. The
  transfer methods are **manual**: the customer transfers to a configured
  destination and uploads proof; staff verifies. **No card gateway in v1.**
- Fulfilment is **delivery zones** and **pickup locations**, and **every
  capability is a switch** the merchant controls (§18).
- The order lifecycle is measured in **days**, not minutes.
- `[ASSUMPTION]` a single-market launch, so flat-rate tax is sufficient and
  jurisdictional tax is v2.

---

## 4. Information architecture

```
/                          home
/products                  the catalog — filter, sort, paginate
/products/[slug]           product detail + variant selection
/categories/[slug]         a navigational category
/collections/[slug]        a merchandising collection
/brands/[slug]             a brand
/search                    search results
/cart                      cart
/checkout                  checkout
/orders/[orderNumber]      order tracking (guest via access token)
/account                   account home
/account/orders            order history
/account/addresses         saved addresses
/account/wishlist          wishlist
/account/returns           returns
/account/profile           profile and password
/login  /signup            auth
/pages/[slug]              about, contact, legal, size guides
```

**`Category` and `Collection` are different concepts and get different URL
spaces** `[ASSUMPTION → D-6]`: a category is hierarchical and navigational and
owns the canonical URL; a collection is flat, many-to-many and curated.
Collapsing them would make canonical URLs and breadcrumbs ambiguous.

---

## 5. Routes — rendering, auth, caching

| Route | Rendering | Auth | Caching |
|---|---|---|---|
| `/` | **ISR** | none | tags: `STORE_PROFILE`, `CONTENT`, `PRODUCTS` |
| `/products` | **ISR** | none | tags: `PRODUCTS`, `CATEGORIES` — see note |
| `/products/[slug]` | **ISR** + `generateStaticParams` | none | tags: `PRODUCTS`, `VARIANTS`, `REVIEWS` |
| `/categories/[slug]` | **ISR** + `generateStaticParams` | none | tags: `CATEGORIES`, `PRODUCTS` |
| `/collections/[slug]` | **ISR** + `generateStaticParams` | none | tags: `COLLECTIONS`, `PRODUCTS` |
| `/brands/[slug]` | **ISR** + `generateStaticParams` | none | tags: `BRANDS`, `PRODUCTS` |
| `/pages/[slug]` | **ISR** + `generateStaticParams` | none | tags: `CONTENT` |
| `/search` | **dynamic** | none | `no-store` |
| `/cart` | **dynamic** | none | `no-store` |
| `/checkout` | **dynamic** | none (guest allowed) | `no-store` |
| `/orders/[orderNumber]` | **dynamic** | session **or** access token | `no-store` |
| `/account/**` | **dynamic** | session required | `no-store` |
| `/login` · `/signup` | **dynamic** | none | `no-store` |

**`generateStaticParams` is not optional on the parameterised catalog routes.**
Without it those pages are dynamic *by inheritance* rather than by choice — which
is what happened to the restaurant's category and item pages — and the ISR story
quietly stops being true while the code still looks like ISR.

**`/products` carries filter state in the URL.** `[ASSUMPTION]` the unfiltered
first page is ISR-cached and any filtered or paginated request is dynamic;
caching every facet combination would be a cache explosion.

**Next 16 has `src/proxy.ts`, not `middleware.ts`.** It gates `/account/**` on
**cookie presence only** — presence is not authentication, and the server
re-checks. It must not read anything that would make a catalog route dynamic.

**Every transactional route is `no-store`. Stock is transactional.**

---

## 6. Screens

### 6.1 Home
Hero from the store profile, featured collections, categories, a product rail,
and content sections — **all configured, none hardcoded**. Renders correctly with
no hero media, no featured collections, and an empty catalog.

### 6.2 Catalog (`/products`)
Product grid, facet filters, sort, pagination. Facets `[ASSUMPTION]`: category,
collection, brand, price range, and the merchant's declared option axes (size,
colour) plus attributes. **Filtering is on variant attributes but the result is
distinct products** — a store lists products, not variants.

Sort by relevance, price ascending/descending (from the derived range), and
newest. **Seek pagination, not deep offsets.**

Each card shows the primary image, name, **price or price range**, a
compare-at price where present, and a low-stock or out-of-stock signal.
`[ASSUMPTION]` no variant swatches on the card — they invite a selection the card
cannot validate. The card links; the product page decides.

### 6.3 Product detail (`/products/[slug]`) — the most important screen
See §10. Gallery, name, price, rating summary, description, **variant
selection**, quantity, add to cart, size guide, shipping and returns summary,
reviews, related products.

### 6.4 Search
Query against localized product content. A genuine empty state with suggestions,
not a blank grid.

### 6.5 Cart
Lines with image, name, **the selected option labels**, unit price, quantity
stepper, line total, remove. Promotion code entry. Subtotal and an indication
that shipping is calculated at checkout. **Totals are never stored** — always
re-quoted, so they cannot go stale.

### 6.6 Checkout
Sections: contact, fulfilment, address or pickup location, payment method,
review. **Split by section from the start** — the restaurant's equivalent is a
556-line file and the largest in that repo.

### 6.7 Payment instructions (transfer methods only)
The configured destination, localised instructions, the exact amount, and proof
upload. A clear recovery path when staff reject a proof.

### 6.8 Order confirmation and tracking
Order number, what happens next, the promised window **in days**, the current
status, and the timeline. Guests reach it by access token.

### 6.9 Account
Orders, addresses, wishlist, returns, profile.

### 6.10 Auth screens
Login, signup, forgot/reset password, email verification.

**No flow may depend on email to complete (D-8).** There is no provider yet, and
one is coming later. Order confirmation, password reset and proof verification
must all work without it: the confirmation page *is* the confirmation, guest
tracking is an access-token link, and proof status is visible in the account.
Recovery flows are built and gated behind the outbound-notification capability,
which **announces itself OFF loudly at startup** rather than degrading silently.
Password reset mints a token, hashes it and **discards the plaintext** — as the
precedent does — so until a provider exists a staff member mints one by hand, and
the backoffice says so.

### 6.11 Content pages
About, contact, legal, size guides — all from the backend, all localized.

---

## 7. Authentication flows

Governed by `../docs/authentication-architecture.md`, with one correction: its §9
says cart, checkout and orders go direct from the browser to the backend. **They
do not, and cannot** — see §8.

- **Sessions are httpOnly cookies set by this app's own route handlers.** No
  token ever touches JavaScript or `localStorage`.
- Login/signup post to this origin; this app exchanges credentials
  server-to-server and sets its own cookie.
- **Signup never signs in** *(changed 2026-10-21)*. It answers `202
  { status: "accepted" }` with no cookie whether or not the phone or email was
  already registered — a distinguishable answer (an error, or a session) is an
  account-existence oracle. The customer then signs in; the guest cart merges at
  login. The residual oracle (sign up, then try to sign in) closes only with
  out-of-band verification (SMS/OTP, deferred).
- **Single-flight refresh.** Without it, a page loading five queries starts five
  refreshes, four present an already-rotated token, reuse detection fires, and
  the user is signed out for doing nothing wrong.
- **Guest checkout is first-class.** A guest cart is identified by a token this
  app keeps in its own cookie.
- **Identity is phone-first, email-optional (D-9).** **Phone** is the login
  identifier and the unique key; **email** is optional, and unique only when
  present. Guest checkout collects **phone, name and address**; email is offered,
  never required. Neither is verifiable in v1 — there is no SMS and no email
  provider — so the `verified` flags exist and stay `false` rather than asserting
  something untrue.
- **A guest ordering with a phone that already has an account must not be told
  so.** The order attaches as a guest order and can be claimed after signing in.
  "That number already has an account" is an enumeration oracle.
- **Cart merge on sign-in** is explicit and non-destructive.
- Logout is a request, not a local state change — the client cannot clear an
  httpOnly cookie.

---

## 8. Data and transport

**One `Endpoint` contract, two clients, not three.**

| Client | Runs in | Transport | Origin | Credentials |
|---|---|---|---|---|
| `storefrontApi` | server only | **fetch** | `STAFF_API_URL` | none |
| `sessionApi` | browser | **Axios** | **this origin** | cookies, same-origin |

**There is deliberately no browser-to-backend client.** The shop surface
authenticates by the backend's own httpOnly customer cookies, set on its origin,
which a browser on this origin cannot hold or send — so a browser call carries
no usable credential no matter what `withCredentials` says. *(Corrected
2026-10-20 — this said `Authorization: Bearer`; see architecture.md §3.)*
Everything on the shop surface goes through this app's own route handlers under `/api/session/**`, which read the cookies
server-side and forward. **That is not a workaround; it is what the backend was
designed for.**

- **`storefrontApi` must stay on the fetch adapter.** Next's Data Cache is driven
  by `fetch(url, { next: { revalidate, tags } })` and is meaningless to any other
  transport. Routing a catalog read through Axios **does not error — it silently
  stops being cached**, and the first sign is a database under load.
- **`STAFF_API_URL` has no `NEXT_PUBLIC_` prefix, deliberately.** The browser
  must never learn the backend's origin; referencing it from a Client Component
  is a build-time `undefined`, which is the correct failure.
- **No API path is hardcoded at a call site.** One `*.endpoints.ts` per domain
  plus a route-constant module. Join with **`joinUrl`**, never
  `new URL(path, base)` — the latter silently drops the base's own path segment.
- **Import server-safe code from `@kira-joo/frontend-toolkit-core/server`.** The
  root entry bundles React-context modules; importing *anything* from it in a
  Server Component or Route Handler crashes with `TypeError: createContext is not
  a function`.
- **Errors use one shape.** Normalise with the toolkit's helpers; never invent a
  second model. **Validation errors map to individual form fields** — a checkout
  that says only "Validation failed" is a defect.

---

## 9. Discovery, browsing and filtering

Category navigation is hierarchical and owns the canonical URL. Collections are
curated entry points. Brands are both a facet and a landing page.

**Filter state lives in the URL** so a filtered view is shareable and
back-navigable. Applied filters are visible and individually removable, with a
clear-all. `[ASSUMPTION]` facet counts are shown only if they can be produced
without a second expensive aggregation; a wrong count is worse than none.

**Empty results are a designed state** — what was searched, what filters are
applied, and a one-tap path to remove the narrowest one.

---

## 10. Product detail and variant selection

**This is the one genuinely new interaction in the product, and it is not a
port** — modifier groups do not exist in the restaurant storefront UI at all, so
there is nothing to migrate.

### The model

**A variant owns its price and its stock, absolutely.** There is no base price
plus a delta. `Product` carries the axes; `Variant` carries `sku`, `price`,
`stock`.

### The matrix is sparse, and availability is existential

The server sends a **compact purchasable-variant matrix**:
`{variantId, optionValues, price, compareAtPrice?, purchasable}`. The client
indexes it and intersects candidate sets, so **a selector click costs no round
trip**.

An axis value is selectable iff **at least one** variant exists that is
purchasable, carries that value, and matches every other current selection.

> **"Size M exists" and "red exists" does NOT imply "M in red exists".**

**Never treat independent per-axis availability as conjunction.** On a sparse
matrix it produces false positives — the customer picks a combination the UI
offered and add-to-cart fails.

### The interaction rules

1. **An unavailable value is shown as unavailable, not hidden.** Hiding makes the
   catalog look smaller than it is; the disabled state *is* the information.
2. **A prior selection invalidated by a later one is retained visibly as
   unavailable and must be replaced. The customer is NEVER silently switched to
   a different variant** — that is how someone buys the wrong thing.
3. **Add-to-cart re-validates server-side regardless** of what the matrix said.
   The matrix is a UI accelerator, never an authority.
4. Price updates as the selection completes. Before it is complete, the product
   shows a **range**.
5. `[ASSUMPTION]` selecting a colour swaps the gallery to that variant's images
   where it has them, falling back to the product gallery.

### The rest of the page

**Reviews require a verified purchase.** The write-review control appears only
for a customer with a **delivered** order containing that product — for everyone
else it is absent, not disabled-with-an-explanation, because "you cannot review
this" is not useful to someone who has not bought it. The reviews themselves are
public.

Multi-image gallery with per-variant override; size guide in a dialog, not a
separate page; **stock signals** — low stock with a threshold, out of stock with
a clear statement rather than a hidden button; shipping and returns summary
sourced from configuration; reviews with an aggregate rating; related products.

**`[ASSUMPTION]` a hard cap of three option axes**, matching the backend. Beyond
that the interaction is combinatorial and the product needs a configurator.

---

## 11. Cart behaviour

- **Lines carry a stable `lineId` and merge on `variantId`** `[ASSUMPTION → D-5]`
  — line-level customisation (engraving, gift messages) is **out of v1**, and
  `lineId` exists anyway so adding it later does not require re-identifying live
  carts.
- **Totals are never stored.** Recomputed on every read.
- Quantity changes and removals are optimistic with a rollback on failure.
- **A line whose variant went out of stock is surfaced explicitly**, not silently
  dropped, with a one-tap remove and a link back to the product.
- A guest cart survives across sessions via this app's own cookie and merges on
  sign-in.
- `[ASSUMPTION]` carts expire after 30 days.

---

## 12. Checkout

Sections: contact → fulfilment → address/pickup → payment → review.

- **This app never computes a price, fee, tax, discount or promised date.** It
  posts the cart and the fulfilment choice; `POST /quote` returns the
  authoritative answer, and the review step shows exactly that.
- **Every order-placing request carries an `Idempotency-Key`.**
- Server validation errors map to **individual fields**.
- Guest checkout collects name, phone and email; a signed-in customer picks a
  saved address.
- **Placement refusals are specific**: out of stock, below the zone minimum,
  outside the served area, no fulfilment capability available. A generic failure
  here loses the sale.

---

## 13. Payment UX (manual transfer methods)

The enabled methods, their order, their localised instructions and their
destinations are **all configuration** — the method picker is fully data-driven
and renders correctly for any subset, including a single method.

For Wallet and InstaPay: show the destination and the exact amount, accept a
proof upload, and state the verification window. **A rejected proof reopens
submission with the staff reason shown** — a dead end here is an abandoned order.

**The uploaded proof is private.** It is never addressed by a guessable URL; the
backend mints a short-lived signed URL behind the same check that guards the
order.

---

## 14. Order lifecycle from the customer's view

Statuses in customer language, **measured in days**: placed → confirmed →
processing → dispatched → in transit → delivered (or ready for collection →
collected). Plus cancelled, and the return path.

- **Order status and payment status are shown as two separate signals.** A COD
  order progresses while unpaid.
- The promised window is a **date range**, not a time.
- Cancellation is available within the configured window.
- A return is requested per line, within the return window.
- `[ASSUMPTION]` tracking is polled while a tab is open, not pushed.

---

## 15. Error, empty and loading states

**States are deliverables, not fallbacks.**

Every list has a real empty state saying what to do next. Every mutation has a
pending state that prevents double submission. Every failure maps to a specific
message. **Distinguish "nothing here yet" from "nothing matches this filter".**

Specific states this product must design rather than discover: out of stock,
variant unavailable for the current selection, cart line no longer purchasable,
zone not served, below zone minimum, **no fulfilment capability enabled at all**
(§18), proof rejected, review pending moderation, and the store having an empty
catalog.

Skeletons match the final layout so nothing shifts. **Layout stability is a
requirement** — a price or an add-to-cart button that moves after load causes
mis-taps.

---

## 16. Responsive behaviour

**375 / 768 / 1024 / 1440**, in **both locales**, on **both grounds** — four
combinations, verified.

**No horizontal page scroll at any width, in either direction.** A wide element's
own container may scroll; the page must not.

Mobile specifics: a persistent, reachable add-to-cart on the product page; the
variant selector usable one-handed; filters in a sheet rather than a sidebar;
touch targets ≥ 44px; the gallery swipeable without hijacking page scroll.

---

## 17. Store configuration — the reusability contract

**This is what makes the codebase a store *platform* rather than one merchant's
website.** Everything below is data, fetched from the backend and cache-tagged.

| Group | Configured |
|---|---|
| Identity | name, tagline, description (Localized), logo, favicon, OG image |
| Brand | primary/accent/surface/text colours, typography choice from a curated set, radius scale |
| **Theme** | default ground, whether dark is enabled, whether the visitor may choose, validated brand-fill overrides |
| Imagery | hero media, category and collection images, product imagery |
| Contact | phone, WhatsApp, email, addresses, map coordinates |
| Social | ordered list of platform + URL |
| Commerce | currency, tax mode and rate, order minimums |
| Fulfilment | **delivery on/off, pickup on/off**, zones with fee/minimum/lead days, pickup locations, operating hours and exceptions, dispatch cutoff |
| Payment | enabled methods, destinations, per-method localised instructions, proof requirements |
| Content | home sections, featured collections, pages, SEO defaults |

**How the theme reaches the CSS.** The root layout fetches the profile
server-side and emits brand values as CSS custom properties — both this app's own
token names and the `--ftk-*` roles where a toolkit component is used. **No theme
value is ever read at render time by a component; components use tokens only.**

### Two guards make this real rather than aspirational

1. **A `predev`/`prebuild` check** that fails the build on a hardcoded hex,
   **brand string**, phone number or social URL in `src/`. **It must catch more
   than the restaurant's does** — that one matches phone numbers and social URLs
   but **not** arbitrary brand names or marketing copy, which its own
   documentation implies it catches.
2. **A second-store fixture** — a deliberately different demo merchant: different
   name, palette, typography, currency, zones, payment methods, enabled
   capabilities **and theme configuration**. §4.6 asks for the last one and it
   matters: *a derived dark palette tested against one brand's colours has not
   been tested.*

**Both run in CI.** Neither restaurant repo has any CI at all, which is why its
fixture — genuinely adversarial, and it did catch a real defect — is manual
discipline rather than a gate.

---

## 18. Fulfilment — every capability is a switch

The merchant controls, from the backoffice, **which fulfilment capabilities exist
at all**: pickup off entirely (delivery-only), delivery off (collection-only),
its own operating days, hours and exceptions, and its own lead times.

**The storefront must render correctly, with no dead UI and no empty
scaffolding, for every combination.**

The rules, taken from what the restaurant does well and what it gets wrong:

- **A mode that is off is filtered out of the array entirely, not disabled.**
- **A single remaining mode is auto-applied silently** — no chooser with one
  option.
- **The degenerate case — nothing enabled — is a first-class designed state.**
  The restaurant renders a bare section header with nothing beneath it, because
  its fixture never exercised that path. Here it says plainly that the store
  cannot currently take orders, and the funnel does not pretend otherwise.
- Zone-not-served and below-minimum are specific, actionable states.
- **Every combination is covered by a component test**, including the degenerate
  one.

---

## 19. Theming

`../docs/store/00-kickoff-brief.md` §4.6 governs. **Light and dark are both
first-class, in both locales — four combinations, not one design with a toggle
bolted on.**

### Two grounds, one geometry

`:root` **is** the light ground; dark overrides **colour, scrim and elevation
only**. **Type, spacing, radius and every duration are declared once on `:root`
and never per ground: the flip must not move a single pixel.** Anything geometric
defined per ground is a bug.

### Resolution is a CSS concern, never JavaScript `[ASSUMPTION → D-3]`

```
:root                                                  → light tokens
@media (prefers-color-scheme: dark)
  :root:not([data-ground="light"])                     → dark tokens
[data-ground="dark"]                                   → dark  (explicit wins)
[data-ground="light"]                                  → light (explicit wins)
```

Why this shape rather than server-side resolution:

- **`prefers-color-scheme` cannot be read server-side at all** — there is no such
  request header without the `Sec-CH-Prefers-Color-Scheme` client hint.
- **Reading a cookie would make catalog routes dynamic and destroy ISR.** The
  restaurant team hit exactly this: *"Trading the whole caching story for a theme
  toggle is not a trade worth making."*
- This honours the system preference **on first paint, with zero JavaScript**,
  keeps every page fully static, and needs no cookie.

Only an **explicit stored choice** is applied, by a tiny synchronous script
injected first in the document, running during parsing before anything paints —
**wrapped in try/catch**, because `localStorage` throws outright in a private
window with site data blocked, in some embedded webviews, and in browsers
configured to refuse storage. An exception there would abort before the attribute
is set, on a page that has not painted.

**No Server Component branches on theme.** A dark-mode flash on a cold load is a
defect, not a polish item — and so is a hydration mismatch.

### The palette is derived, and brand override is narrow

The merchant enters brand colours once; the backend **derives** the dark palette
with **contrast guarantees**. Override is permitted for **brand fills only**,
validated against both grounds, falling back to the derived value
`[ASSUMPTION → D-2]`.

Two recorded failures define why:

1. An operator-supplied ink measured **3.63:1** and failed **16 nodes across 8
   routes** the moment a second store rendered. **So the ink is derived: the
   failure cannot occur rather than being caught.**
2. A brand `soft` **surface** hex painted a cart notice cream-on-cream on the
   dark ground, because **a surface is ground-dependent** and one inline value
   wins over *both* ground blocks. Every contrast pair still passed, because the
   failing pair was substituted at runtime.

**Text, border and state colours are never brand-overridable** — they carry the
measured ratios.

### Verification

Every visual and accessibility gate runs across **all four combinations**. A
contrast failure in dark/`ar` fails exactly as loudly as one in light/`en`.

---

## 20. Accessibility

Requirements, not aspirations, and each is verifiable.

- **WCAG 2.1 AA on both grounds**, with ratios recorded in `design-system.md`,
  including **non-text contrast (1.4.11)** for controls and focus rings.
- **Full keyboard operability** — facets, the variant selector, quantity
  steppers, the cart drawer, every checkout section.
- **Visible focus** everywhere; trapped in dialogs and sheets; restored on close.
- **The variant selector is the hard case**: values are real `<button>` elements
  with `aria-pressed`, an unavailable value is `aria-disabled` **with its reason
  announced**, and colour is never the sole carrier of the selected state.
- **Semantic structure** — one `h1` per page, correct order, landmarks, real
  `<button>`/`<a>` rather than clickable `div`s.
- **Forms** — every input labelled, errors linked with `aria-describedby` and
  announced, `aria-invalid` set, never colour as the sole error signal.
- **Live regions** for cart updates, stock changes and toasts.
- **Images** — descriptive `alt` authored in the backoffice, empty `alt` for
  decoration.
- **RTL correctness is an accessibility requirement here**, not just layout:
  logical properties throughout, mirrored directional icons, correct number and
  currency formatting per locale.
- **`prefers-reduced-motion`** honoured by every animation, with a genuine
  non-animated path — **not a shortened duration**.

---

## 21. SEO

The storefront is a real business's front door.

- Server-rendered content on every indexable route; ISR keeps it fresh.
- **Structured data**: `Store`, `Product` with an **`Offer` per variant**,
  `BreadcrumbList`, `AggregateRating` where reviews exist. The restaurant's
  JSON-LD *component* is reusable; its `Restaurant`/`MenuItem` types are not.
- **Canonical URLs** — a product's canonical is its category path; a collection
  listing does not compete with it.
- `hreflang` for `ar`/`en`, sitemap and robots generated from the catalog.
- **Facet URLs are `noindex`** `[ASSUMPTION]` beyond the first unfiltered page,
  to avoid an index full of near-duplicates.
- Localized metadata and OG images from the profile.

---

## 22. Performance

- **Import from subpath entry points, never a root barrel.** Measured inside the
  toolkit itself — `frontend-toolkit-tailwind/tsup.config.ts:17`: *"Measured in a
  real Next production build, importing a single trivial component from the
  barrel cost 93 kB of First Load JS."* (The restaurant `CLAUDE.md` attributes
  this to "the package's own build notes"; no such markdown file exists — the
  figure lives in the build config, and it does check out.)
- **Server Components by default**; `"use client"` only where interaction
  requires it. The variant selector is client; the product page around it is not.
- Images sized and formatted per breakpoint, with the ratio locked so nothing
  shifts.
- **Layout stability is a hard requirement** — a moving price or add-to-cart
  button causes mis-taps.
- `[ASSUMPTION]` budgets: LCP < 2.5 s and CLS < 0.05 on a mid-range phone over
  4G, measured rather than assumed.
- The variant matrix is a **compact projection**, never the admin inventory
  shape.

---

## 23. Motion principles

- **`motion`, imported as `motion/react`.** Never `framer-motion`, never GSAP,
  never a second engine. Prefer CSS transitions where they suffice.
- **Durations and easing come from tokens.** No literals anywhere.
- **Motion never delays an action.** Add-to-cart feedback is immediate; the
  animation decorates it.
- **`prefers-reduced-motion` gets a genuine non-animated path.**
- Nothing animates on the critical path to first paint.
- **The ground flip is not animated** — geometry does not move, and a colour
  crossfade across a whole page is nausea, not polish.

---

## 24. Content and data model assumptions

The storefront consumes, and never owns: `StoreProfile` (identity, brand, theme,
contact, social, commerce, fulfilment, payment, content), `Category`,
`Collection`, `Brand`, `Product` (with `optionAxes` and listing rollups),
`Variant` (the purchasable unit), `SizeGuide`, `Review`, `Promotion`, `Cart`,
`Order`, `Return`, `Customer`, `Address`, `Wishlist`.

**Money arrives as a string and is never arithmetic here.** It is formatted
through `moneyView(currency, locale)` and nothing else.

**Numerals are per locale, with a confirmed carve-out (D-10).** `ar` renders
Arabic-Indic (`٤٥٠ ج.م`); `en` renders Western (`EGP 450`). **SKUs, order
numbers, phone numbers and tracking numbers stay Western in both locales** —
they are identifiers people copy, dictate and retype elsewhere, and `CHS-42-BE`
has no Arabic form. **One helper per content type** — `formatPrice`, `formatSku`,
`formatOrderNumber`, `formatPhone`, `formatTracking` — and **no component decides
this.** A component choosing its own numeral system is how two of them drift
apart inside a single row. **Zero arithmetic
operators on money in this codebase** — verifiable, and verified in the
restaurant's checkout.

**Cart-line identity is server-issued and opaque.** This app never constructs a
line key.

---

## 25. API requirements (consumed)

From `/api/storefront/**`, cached with tags: store-profile, theme,
fulfilment-settings, payment-methods (display fields only), operating-hours,
delivery-zones, pickup-locations, categories, collections, brands, products,
products/[slug] **including the purchasable variant matrix**, facets,
size-guides, reviews, promotions/active, pages, search.

From `/api/shop/**` **via this app's own `/api/session/**` handlers**, never
cached: auth, cart, quote, orders, payment-proof, returns, reviews, profile,
addresses, wishlist.

**A receiving route for cache invalidation** — verifying the shared secret in
constant time and revalidating only known tags. **Its absence is the third
silence in the composition that once left prerendered pages serving a stale price
indefinitely while the cart charged the new one.** It exists from the first
cache-tagged read, and a test proves it is reached.

---

## 26. Reusable UI patterns

Product card · product grid · facet filter panel and sheet · applied-filter chips
· **variant selector** · quantity stepper · price display (single and range, with
compare-at) · stock signal · gallery with per-variant override · size-guide
dialog · rating summary · cart line · order summary · address form · payment
method picker · proof upload · status timeline · empty/error/loading states ·
ground toggle.

**No package or toolkit architecture is visible in customer-facing UI.** This app
consumes `@kira-joo/frontend-toolkit-tailwind` **sparingly** — `cn`, validation
helpers, possibly the dialog stack. `FeatureTable`, `SideNav`, `PageShell` and
the charts are admin furniture and do not belong here.

---

## 27. QA requirements

**This product takes money. Required, not aspirational.**

- **Unit:** every pure function — money formatting, cart-line matching,
  **variant-matrix resolution including sparse combinations**, facet URL
  serialisation, validation schemas. Plus **a test proving the
  independent-per-axis shortcut would produce a false positive**, so the correct
  existential implementation is pinned rather than incidental.
- **Component:** every state of every checkout and auth component, including
  error and loading; the variant selector across available, unavailable,
  invalidated-prior-selection and out-of-stock; and **every
  fulfilment-capability combination including the degenerate one** — no dead UI,
  no empty scaffolding.
- **Integration:** cart merge on sign-in, checkout with server validation errors
  mapped to fields, session refresh mid-request, optimistic rollback,
  add-to-cart rejected because stock changed after the page was cached.
- **E2E:** the full funnel in **both locales and both grounds**, all three
  payment methods, plus guest checkout, out-of-stock recovery, zone-not-served,
  and proof-rejection recovery.
- **Browser QA** at 375/768/1024/1440, both locales, both grounds. **Measure the
  DOM for anything geometric** — a screenshot proves what a frame looked like,
  not why.
- **The configuration proof:** the full funnel passes against the second-store
  fixture, in CI.
- **Cache correctness, observed on a genuinely prerendered page.** Change a price
  in the backoffice and verify the prerendered product page updates. *The
  invalidation failure that earned this rule was invisible exactly where anyone
  would look, because every page a person thought to check was dynamic and every
  dynamic page was correct.*
- **And confirm the guards can fail.** *A test that cannot fail proves nothing.*
  Break the token guard with a hex, a phone number, a social URL and a brand
  string, and both contrast gates on both grounds, and confirm each goes red.
