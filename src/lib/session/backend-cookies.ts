/*
 * Translation between the backend's customer cookies and this app's own.
 * Pure — no Next imports — so it is unit-tested directly.
 *
 * Backend names (mimora-staff core/auth/customer-session-cookies.ts):
 *   store_customer_session — access JWT, path /, 15 min
 *   store_customer_refresh — rotating refresh token, path /api/shop/auth, 30 d
 *   store_customer_marker  — "1", path /, 30 d
 */
export const BACKEND_COOKIE = {
  session: "store_customer_session",
  refresh: "store_customer_refresh",
  marker: "store_customer_marker",
} as const;

export interface ParsedSetCookie {
  name: string;
  value: string;
  maxAge?: number;
  expires?: Date;
}

export function parseSetCookie(header: string): ParsedSetCookie | null {
  const [pair, ...attributes] = header.split(";");
  const eq = pair?.indexOf("=") ?? -1;
  if (!pair || eq <= 0) return null;
  const parsed: ParsedSetCookie = { name: pair.slice(0, eq).trim(), value: decodeURIComponent(pair.slice(eq + 1).trim()) };
  for (const attribute of attributes) {
    const [rawKey, ...rest] = attribute.split("=");
    const key = rawKey?.trim().toLowerCase();
    const value = rest.join("=").trim();
    if (key === "max-age" && value) parsed.maxAge = Number(value);
    if (key === "expires" && value) parsed.expires = new Date(value);
  }
  return parsed;
}

/** A Set-Cookie that deletes: empty value, Max-Age ≤ 0, or an Expires in the past. */
export function isDeletion(cookie: ParsedSetCookie, now = Date.now()): boolean {
  return cookie.value === "" || (cookie.maxAge !== undefined && cookie.maxAge <= 0) || (cookie.expires !== undefined && cookie.expires.getTime() <= now);
}

export interface SessionChange {
  session?: { value: string; maxAge?: number };
  refresh?: { value: string; maxAge?: number };
  /** The backend cleared the session (logout, failed refresh, password reset). */
  cleared: boolean;
}

/** Reads what the backend did to the customer session from its Set-Cookie headers; null when it did nothing. */
export function sessionChangeFrom(setCookies: string[], now = Date.now()): SessionChange | null {
  const change: SessionChange = { cleared: false };
  let touched = false;
  for (const header of setCookies) {
    const cookie = parseSetCookie(header);
    if (!cookie) continue;
    if (cookie.name === BACKEND_COOKIE.session) {
      touched = true;
      if (isDeletion(cookie, now)) change.cleared = true;
      else change.session = { value: cookie.value, maxAge: cookie.maxAge };
    } else if (cookie.name === BACKEND_COOKIE.refresh) {
      touched = true;
      if (isDeletion(cookie, now)) change.cleared = true;
      else change.refresh = { value: cookie.value, maxAge: cookie.maxAge };
    }
  }
  return touched ? change : null;
}

/** The Cookie header the backend expects, from the tokens this app holds. */
export function backendCookieHeader(tokens: { session?: string; refresh?: string }): string | undefined {
  const parts: string[] = [];
  if (tokens.session) parts.push(`${BACKEND_COOKIE.session}=${tokens.session}`);
  if (tokens.refresh) parts.push(`${BACKEND_COOKIE.refresh}=${tokens.refresh}`);
  return parts.length ? parts.join("; ") : undefined;
}
