import createMiddleware from "next-intl/middleware";
import { defineRouting } from "next-intl/routing";
import { NextResponse, type NextRequest } from "next/server";
import { getStoreLocales } from "./lib/config/store-locales-source";
import { resolveLocaleRedirect, type StoreLocales } from "./i18n/store-locales";

/*
 * Locale routing, and the account guard (MDS §5).
 *
 * LOCALES COME FROM THE STORE PROFILE (plan #76), not from the codebase's
 * shipped list: `/` goes to the profile's default, a request for a locale the
 * store does not serve is redirected to the same path under the default, and the
 * intl middleware — which also writes the `Link: rel="alternate"; hreflang`
 * response headers — is built per served-locale set, so those headers name only
 * languages the store offers. The profile is read through
 * `getStoreLocales` (in-process TTL cache, single-flight, short timeout,
 * fail-open) — never a blocking backend call per request.
 *
 * The guard is a convenience redirect, never authorisation — the backend
 * re-checks every request. It looks only at cookie PRESENCE: no session and no
 * session marker means definitely signed out. A marker without an access token
 * is an expired session the client will refresh, so it is let through.
 *
 * It reads nothing that could make a catalog route dynamic: only `/account`
 * paths consult cookies at all.
 *
 * `/preview` is the isolated design preview with its own root layout; it is
 * excluded so locale routing never rewrites it.
 */
const ACCOUNT = /^\/(?:ar|en)\/account(?:\/|$)/;

/** One intl middleware per served-locale set — they are cheap, but rebuilding one per request is not. */
const intlByLocales = new Map<string, ReturnType<typeof createMiddleware>>();

function intlFor(locales: StoreLocales) {
  const key = `${locales.defaultLocale}|${locales.supported.join(",")}`;
  let middleware = intlByLocales.get(key);
  if (!middleware) {
    // `localeDetection: false` — `/` is the store's default rather than negotiated from Accept-Language, so a cached page never varies by header.
    middleware = createMiddleware(defineRouting({ locales: [...locales.supported], defaultLocale: locales.defaultLocale, localeDetection: false }));
    intlByLocales.set(key, middleware);
  }
  return middleware;
}

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const locales = await getStoreLocales();

  const redirectPath = resolveLocaleRedirect(pathname, locales);
  if (redirectPath) {
    const url = request.nextUrl.clone();
    url.pathname = redirectPath;
    return NextResponse.redirect(url);
  }

  if (ACCOUNT.test(pathname) && !request.cookies.get("sf_session") && !request.cookies.get("sf_marker")) {
    const url = request.nextUrl.clone();
    url.pathname = `/${pathname.split("/")[1]}/login`;
    url.search = "";
    url.searchParams.set("redirectTo", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return intlFor(locales)(request);
}

export const config = {
  // Everything except API routes, Next internals, the design preview, and files with an extension.
  matcher: ["/((?!api|_next|_vercel|preview|.*\\..*).*)"],
};
