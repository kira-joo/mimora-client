import "server-only";
/*
 * `/server`, never the root barrel: the root bundles React-context modules and
 * crashes any Server Component that imports it with `createContext is not a
 * function` (mimora-client/CLAUDE.md).
 */
import { createApiClient, fetchAdapter, joinUrl, type ApiClient, type RequestAdapter } from "@kira-joo/frontend-toolkit-core/server";
import { verifyBackendIdentity } from "../config/backend-identity";
import { staffApiUrl } from "../config/server-env";

/**
 * Server-side catalog reads. **Must stay on the fetch adapter** — Next's Data
 * Cache is driven by `fetch(url, { next: { revalidate, tags } })` and is
 * meaningless to any other transport; routing a catalog read through Axios
 * does not error, it silently stops being cached (04 §3).
 *
 * The base URL owns the `api/storefront` prefix; endpoint constants own only
 * the resource path, joined with `joinUrl` (never `new URL(path, base)`).
 */
let client: ApiClient | undefined;

/**
 * The fetch adapter, behind the backend identity check: nothing is sent to `STAFF_API_URL` until it has answered as THIS
 * store, and a refused backend's response is never used. The check is memoised, so it costs one call per process; it is
 * itself `no-store` and independent of the read's own `next: { revalidate, tags }`, which passes through untouched.
 * A failure surfaces as the client's normalised error with no status, so `orNull` (D-15) degrades it like an outage.
 */
const verifiedFetchAdapter: RequestAdapter = async (request) => {
  await verifyBackendIdentity();
  return fetchAdapter(request);
};

export function storefrontApi(): ApiClient {
  client ??= createApiClient({ baseURL: () => joinUrl(staffApiUrl(), "api/storefront"), adapter: verifiedFetchAdapter, timeoutMs: 10_000 });
  return client;
}
