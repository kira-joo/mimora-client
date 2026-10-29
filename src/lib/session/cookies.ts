import "server-only";
import { cookies } from "next/headers";

/*
 * This app's OWN session cookies, on the origin the customer is browsing.
 *
 * The backend authenticates a customer by ITS cookies (store_customer_*),
 * set on ITS origin — which this origin can neither read nor send. So the
 * exchange is server-to-server: the BFF receives the backend's Set-Cookie
 * values, keeps them here in httpOnly cookies, and forwards them as a Cookie
 * header (./backend-cookies.ts). Browser JavaScript never sees a token.
 *
 * Every attribute is load-bearing (workspace CLAUDE.md, Authentication):
 * httpOnly; Secure outside development; SameSite=Lax (Strict would drop the
 * session on every arrival from search or social); an explicit path, and the
 * SAME path when clearing — a cookie cleared on another path stays set and the
 * customer is still signed in.
 *
 * The refresh cookie travels only beneath `REFRESH_PATH`, and the routes that
 * need it (refresh, logout) live under that prefix — not the other way round.
 * Widening it to `/` so a sibling logout can read it is the wrong trade; the
 * restaurant storefront made it and signing out revoked nothing while
 * answering 200.
 */
export const COOKIE = {
  /** The access token. Its lifetime mirrors the backend's (15 min). */
  session: "sf_session",
  /** The rotating refresh token — the more valuable credential, so the narrowest path. */
  refresh: "sf_refresh",
  /** "A session exists" — no credential in it. Distinguishes an EXPIRED customer from a guest. */
  marker: "sf_marker",
  /** The guest cart token (backend `x-cart-token`). */
  cart: "sf_cart",
} as const;

export const REFRESH_PATH = "/api/session/auth";
export const CART_MAX_AGE = 60 * 60 * 24 * 30;

const secure = process.env.NODE_ENV !== "development";
const base = (path: string) => ({ httpOnly: true, secure, sameSite: "lax" as const, path });

export async function readSessionCookies() {
  const jar = await cookies();
  return {
    session: jar.get(COOKIE.session)?.value || undefined,
    refresh: jar.get(COOKIE.refresh)?.value || undefined,
    marker: jar.get(COOKIE.marker)?.value === "1",
    cart: jar.get(COOKIE.cart)?.value || undefined,
  };
}

/** "active" | "expired" (marker without access token — refresh first, never treat as guest) | "anonymous". */
export type SessionState = "active" | "expired" | "anonymous";

export async function sessionState(): Promise<SessionState> {
  const { session, marker } = await readSessionCookies();
  if (session) return "active";
  return marker ? "expired" : "anonymous";
}

export interface IssuedSession {
  session?: { value: string; maxAge?: number };
  refresh?: { value: string; maxAge?: number };
  cleared?: boolean;
}

/** Writes the access/refresh/marker trio together — the marker lives exactly as long as the refresh token. */
export async function writeSession(issued: IssuedSession): Promise<void> {
  const jar = await cookies();
  if (issued.cleared) return clearSession();
  if (issued.session) jar.set(COOKIE.session, issued.session.value, { ...base("/"), ...(issued.session.maxAge ? { maxAge: issued.session.maxAge } : {}) });
  if (issued.refresh) {
    const maxAge = issued.refresh.maxAge;
    jar.set(COOKIE.refresh, issued.refresh.value, { ...base(REFRESH_PATH), ...(maxAge ? { maxAge } : {}) });
    jar.set(COOKIE.marker, "1", { ...base("/"), ...(maxAge ? { maxAge } : {}) });
  }
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE.session, "", { ...base("/"), maxAge: 0 });
  jar.set(COOKIE.refresh, "", { ...base(REFRESH_PATH), maxAge: 0 });
  jar.set(COOKIE.marker, "", { ...base("/"), maxAge: 0 });
}

export async function writeCartToken(token: string): Promise<void> {
  (await cookies()).set(COOKIE.cart, token, { ...base("/"), maxAge: CART_MAX_AGE });
}

export async function clearCartToken(): Promise<void> {
  (await cookies()).set(COOKIE.cart, "", { ...base("/"), maxAge: 0 });
}

/**
 * Whether this visitor can have a cart at all: a guest cart token or a session
 * (active or expired). With neither, the cart is certainly empty — so the cart
 * and checkout pages render their empty state at once instead of a skeleton that
 * collapses into it (MDS §15: layout stability). Presence only; the cart itself
 * is still read live.
 */
export async function mayHaveCart(): Promise<boolean> {
  const { cart, session, marker } = await readSessionCookies();
  return Boolean(cart || session || marker);
}
