# Storefront design preview

A browsable, isolated preview of the storefront design — **not** the
production storefront, and **not** an approval of `docs/design-system.md`. It
exists so the owner can judge the design as a product before Phase 6.

## Run it

```bash
docs/tasks/ws dev store-platform 3200    # from the workspace root
# or: cd store-platform && npm run dev -- --port 3200
```

Open <http://localhost:3200/preview> (redirects to the Arabic home).

## What it is — and is not

- **Isolated.** All preview code is under `src/preview/` and
  `src/app/preview/`; mock data under `src/preview/fixtures/`; photographs
  under `public/preview/images/` (Unsplash, credited in `CREDITS.md`, preview
  only). Nothing here calls an API or touches production data.
- **Not shipped.** A production build serves every `/preview/**` route as a
  404 unless `DESIGN_PREVIEW=1` is set at build and start.
- **Real contracts, mock data.** The fixtures use the backend's real shapes —
  `StorefrontContentView` for the home page, `MatrixVariant` for variants —
  so the layouts are fed what the production storefront will be fed.
- **No business logic in the UI.** Prices, totals and filtering that the
  server owns run in `src/preview/mock-api/` (standing in for
  `/api/shop/quote` and `/api/storefront/products`), on `Decimal` through the
  toolkit. Components only format.

## Review controls

The dark bar at the top ("Review controls") switches screen, language
(Arabic RTL / English LTR), ground (system / light / dark), typography pairing
(D-S4), brand (D-S1: the designed default vs a second store's colours as the
backend's contrast engine resolves them), and the product-card layout (§12a as
specified vs a proposed alternative). Choices persist per browser.

## What is not in the preview

Account, auth, order tracking, payment-proof upload, legal pages and search
results beyond the listing's `?q=` are out of scope for this review. Cart and
checkout are seeded and work end to end against the mock quote; placing an
order shows the confirmation and empties the cart.
