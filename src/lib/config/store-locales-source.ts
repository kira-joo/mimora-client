import { joinUrl } from "@kira-joo/frontend-toolkit-core/server";
import { FALLBACK_STORE_LOCALES, resolveStoreLocales, type StoreLocales } from "@/i18n/store-locales";

/*
 * The store's locales for the PROXY (plan #76), which runs before every request.
 *
 * The proxy cannot lean on the page-level Data Cache, and a blocking backend
 * call per request would put the whole storefront's latency — and its
 * availability — behind one endpoint. So the read is:
 *
 *  - cached in process for `ttlMs` (a fresh answer costs nothing);
 *  - single-flight (a burst of requests when it expires makes ONE fetch);
 *  - bounded by a short timeout;
 *  - fail-OPEN: on error the last good answer keeps serving (stale), and with
 *    none, both shipped locales apply — a backend outage must not turn into
 *    "every page redirects somewhere wrong". A failure is retried after the
 *    shorter `failureTtlMs`, so a dead backend is probed rarely, not per request.
 *
 * Deliberately NOT `server-only`: the proxy bundle is its own module graph.
 * The cost of the TTL is that a locale change reaches the proxy within
 * `ttlMs` of the owner saving it, rather than instantly.
 */
export interface LocalesSourceOptions {
  /** Resolves the raw profile fields; may throw. */
  readProfile: () => Promise<{ supportedLocales?: readonly string[] | null; defaultLocale?: string | null }>;
  ttlMs: number;
  failureTtlMs: number;
  now?: () => number;
  onFailure?: (error: unknown) => void;
}

export function createStoreLocalesSource(options: LocalesSourceOptions): () => Promise<StoreLocales> {
  const now = options.now ?? Date.now;
  let current: { value: StoreLocales; expiresAt: number } | undefined;
  let inflight: Promise<StoreLocales> | undefined;

  async function refresh(): Promise<StoreLocales> {
    try {
      const value = resolveStoreLocales(await options.readProfile());
      current = { value, expiresAt: now() + options.ttlMs };
      return value;
    } catch (error) {
      options.onFailure?.(error);
      // Keep serving the last good answer if there is one; retry soon either way.
      const value = current?.value ?? FALLBACK_STORE_LOCALES;
      current = { value, expiresAt: now() + options.failureTtlMs };
      return value;
    } finally {
      inflight = undefined;
    }
  }

  return async function storeLocales() {
    if (current && current.expiresAt > now()) return current.value;
    inflight ??= refresh();
    return inflight;
  };
}

/** The live read: the same public `store-profile` endpoint the storefront already serves, with its own short timeout. */
async function readStoreProfile() {
  const base = process.env.STAFF_API_URL;
  if (!base) throw new Error("STAFF_API_URL is not set");
  const response = await fetch(joinUrl(base, "api/storefront/store-profile"), { cache: "no-store", signal: AbortSignal.timeout(1500), headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`store-profile responded ${response.status}`);
  return (await response.json()) as { supportedLocales?: string[]; defaultLocale?: string };
}

let warned = false;

export const getStoreLocales = createStoreLocalesSource({
  readProfile: readStoreProfile,
  ttlMs: 30_000,
  failureTtlMs: 5_000,
  onFailure: (error) => {
    // Once per process: a dead backend must be visible, not spam every request.
    if (warned) return;
    warned = true;
    console.error(`[locales] the store profile could not be read (${error instanceof Error ? error.message : String(error)}) — serving every shipped locale until it can.`);
  },
});
