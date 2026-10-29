import { LOCALES, type Locale } from "./routing";

/*
 * Which of the shipped locales this STORE serves (plan #76) — the store
 * profile's `supportedLocales` and `defaultLocale`, resolved at request time.
 *
 * `routing.ts` declares what the codebase can render (it ships `ar` and `en`
 * messages); the profile decides which of those a merchant turns on. Pure
 * functions only — the proxy, the locale switch, hreflang alternates and the
 * sitemap all ask the same questions of the same answer.
 *
 * Build-time static params deliberately stay `routing.locales` (D-15: a build
 * with no backend must still produce its pages). A page for a locale the store
 * does not serve is simply never reached — the proxy redirects it away.
 */
export interface StoreLocales {
  /** In the profile's own order, deduplicated, only locales the codebase ships. */
  readonly supported: readonly Locale[];
  /** Always a member of `supported`. */
  readonly defaultLocale: Locale;
}

/** What applies when the profile cannot be read or lists nothing usable: every shipped locale, Arabic first — the codebase's own default (MDS §3). Failing open keeps the store reachable. */
export const FALLBACK_STORE_LOCALES: StoreLocales = { supported: LOCALES, defaultLocale: "ar" };

const isShipped = (value: string): value is Locale => (LOCALES as readonly string[]).includes(value);

export function resolveStoreLocales(profile: { supportedLocales?: readonly string[] | null; defaultLocale?: string | null } | null | undefined): StoreLocales {
  const supported = [...new Set((profile?.supportedLocales ?? []).filter(isShipped))];
  if (supported.length === 0) return FALLBACK_STORE_LOCALES;

  const requested = profile?.defaultLocale;
  // A default the store does not serve is a misconfiguration, not an instruction: prefer Arabic if it is served, else the first served.
  const defaultLocale = requested && isShipped(requested) && supported.includes(requested) ? requested : supported.includes("ar") ? "ar" : supported[0]!;
  return { supported, defaultLocale };
}

export function isSupportedLocale(value: string | undefined, locales: StoreLocales): value is Locale {
  return value !== undefined && (locales.supported as readonly string[]).includes(value);
}

/**
 * Where a request path must be redirected for the store's locales, or `null`
 * when it is already correct (or not ours to decide):
 *
 * - `/` goes to the store's default locale;
 * - `/xx/...` for a shipped locale the store does NOT serve goes to the same
 *   path under the default locale;
 * - an unprefixed path (`/products`) is prefixed with the default locale — the
 *   same thing the intl middleware would do, but with the store's default
 *   rather than the codebase's.
 *
 * A path under a served locale returns `null`.
 */
export function resolveLocaleRedirect(pathname: string, locales: StoreLocales): string | null {
  const normalized = pathname === "" ? "/" : pathname;
  if (normalized === "/") return `/${locales.defaultLocale}`;

  const [, first = "", ...rest] = normalized.split("/");
  if (isShipped(first)) {
    if (isSupportedLocale(first, locales)) return null;
    const remainder = rest.join("/");
    return `/${locales.defaultLocale}${remainder ? `/${remainder}` : ""}`;
  }
  return `/${locales.defaultLocale}${normalized}`;
}

/** hreflang alternates for a locale-less `path` ("" for home, "/products/x"): one per SERVED locale, so a search engine is never pointed at a language the store does not offer. */
export function alternateLanguages(path: string, locales: StoreLocales): Record<string, string> {
  return Object.fromEntries(locales.supported.map((locale) => [locale, `/${locale}${path}`]));
}
