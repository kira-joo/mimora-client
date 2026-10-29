# Storefront configuration

Derived from the code on 2026-10-24. The single source is `src/lib/config/env-validation.ts`
(`ENV_VARS`): each variable is declared there with its tier, whether it is a secret, and a validator,
and `env-inventory.test.ts` fails when `src` reads a variable the table does not declare. Re-derive
before trusting this list. How to deploy: `deployment.md`.

| Variable | Tier | Secret | What happens without it |
|---|---|---|---|
| `STAFF_API_URL` | required | no | Every catalog read and every cart, checkout and account call. **Server-only — never `NEXT_PUBLIC_`**; a `NEXT_PUBLIC_` look-alike is reported at boot. Production boot refuses to start. |
| `SITE_URL` | required | no | Metadata, canonical links, sitemap and robots. **The production build throws** (and production boot refuses to start). https in production, no path-less query. Not `NEXT_PUBLIC_`. |
| `STORE_ID` | required | no | This deployment's store id, a slug (`^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$`). **Must equal the backend's `STORE_ID`.** Production boot refuses to start without it or when malformed; the build does not need it. Without a matching backend, nothing is read from or sent to it. |
| `STORE_TIMEZONE` | required | no | Dates would render in UTC. Production boot refuses to start. Must equal the backend's value; checked through `Intl`. |
| `REVALIDATE_SECRET` | capability | yes | Cache invalidation is OFF (announced once at boot): the receiver answers 404 to the backend, and prerendered prices lag by the 300s safety net. Must equal the backend's value; 32+ characters when set. |
| `TRUST_X_REAL_IP` | optional | no | Set `1` only behind a proxy that overwrites `X-Real-IP`. |
| `DESIGN_PREVIEW` | optional | no | `1` serves `/preview` in a production build; reported at boot if left on in production. |

**Tiers.** *required* — at **production boot** (`src/instrumentation.ts` →
`assertProductionEnvironment`) a missing or unusable one stops the process with a message listing the
variable's NAME and the reason, never the value; `SITE_URL` additionally stops the production
**build** (`assertBuildEnvironment`, and `siteOrigin()` itself throws while building — verified with a
real `next build` with `SITE_URL` unset). The build deliberately checks nothing else: `next build` runs
without a backend. *capability* — absent is announced once by `configurationGaps`
(`startup-check.ts`); set-but-unusable is an error notice. *optional* — validated only when set.
Outside production nothing is enforced.

## Backend identity (`STORE_ID`)

One deployment serves one store, so the storefront verifies that `STAFF_API_URL` is that store's backend
(`src/lib/config/backend-identity.ts`). The backend exposes `GET /api/storefront/identity` →
`{ "storeId": string }` (public, uncached) and answers it only after verifying its own database marker. The storefront
compares the answer with its `STORE_ID` **before every backend call** — in `storefront-client.ts` (catalog reads) and
`shop-request.ts` (the cart, checkout and account BFF):

- match → proceeds; remembered per process, so one request in total; a failure is never remembered.
- mismatch → a clear error (`configured as store 'a' but STAFF_API_URL answers as store 'b'`), logged loudly once per
  answer; catalog reads degrade to their absent state (`orNull`, D-15) and BFF calls answer `503`; nothing is forwarded.
- unreachable or non-2xx → a retryable error, handled as the backend being down; a build without a backend still succeeds.
- `STORE_ID` unset outside production → skipped with a one-time warning (local development, unit tests).

The identity call is `no-store` and uses Next's unpatched `fetch`, so it never makes an ISR page dynamic; the catalog
read's own `next: { revalidate, tags }` is unchanged. At production boot `register()` attempts the check once and logs
`[identity] verified store 'x'`, a loud error on a mismatch, or a warning if the backend is unreachable; it never stops the boot.
The CI configuration proof adopts `store-a` / `store-b` into each fixture database and gives both processes that `STORE_ID`.

## `.env.example`

The agent that wrote this could not create `.env.example` (the Write tool denied the path), so its
content is in `docs/env-example.txt`. Install it with `sed '3,6d' docs/env-example.txt > .env.example` and
delete the text file. Placeholders only. Then `node ../docs/tasks/check-env-example.mjs $PWD` checks it
against the code; the QA scripts' own variables (`BACKEND_URL`, `OWNER_EMAIL`, `OWNER_PASSWORD`,
`FIXTURE_MANIFEST`, `ROUTES`) are reported as undocumented and are not application configuration.

## Signup and the phone number

Signup never signs a customer in, and answers the same whether or not the
number was already registered (an account-existence oracle otherwise). The
signup form hands over to the login page with a fixed notice; the phone is
passed in this tab's `sessionStorage`, never in the URL
(`src/lib/session/signup-handoff.ts`). The guest cart merges at login.

## Local development and test data

- Dev database: `store-platform-staff-dev`. Integration tests:
  `store-platform-staff-test`. Fixtures: `store-fixture-a` and `store-fixture-b`
  (see `../store-platform-staff/scripts/fixtures/`). Each is a separate database on
  the local replica set; none is ever a production database. The fixture seeder
  refuses any non-local host.
- Secrets for local runs are generated per machine and live outside both
  repositories. Nothing here, in a commit, or in a report carries a value.
