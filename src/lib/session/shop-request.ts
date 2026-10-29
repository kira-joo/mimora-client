import "server-only";
import { NextResponse } from "next/server";
import { buildUrl, joinUrl } from "@kira-joo/frontend-toolkit-core/server";
import { BackendIdentityError, verifyBackendIdentity } from "../config/backend-identity";
import { staffApiUrl } from "../config/server-env";
import type { ShopEndpoint } from "../api/shop.endpoints";
import { backendCookieHeader, sessionChangeFrom } from "./backend-cookies";
import { clearCartToken, clearSession, readSessionCookies, writeCartToken, writeSession } from "./cookies";

/*
 * The one place this app talks to `/api/shop/**`. Every `/api/session/**`
 * handler goes through it, so the session rules live in exactly one place:
 *
 * - The customer's tokens travel as the backend's Cookie header, read from this
 *   app's own httpOnly cookies; whatever the backend sets or clears is copied
 *   back onto this origin. The browser never holds a token.
 * - The guest cart token (backend `x-cart-token`) is kept in an httpOnly
 *   cookie and stripped from every body before it reaches the browser.
 * - **Expired is not guest.** With the access cookie gone but the session
 *   marker still present, this answers 401 without calling the backend, so the
 *   client refreshes first. Forwarding instead would be served as a guest —
 *   an empty cart for a signed-in customer, with no error anywhere (the
 *   restaurant storefront shipped exactly that).
 * - The real client IP is forwarded: the backend rate-limits by IP, and without
 *   it every customer shares this server's bucket.
 * - `Idempotency-Key` comes from the client, per action, so a retried tap
 *   replays rather than repeats (04 §8). This layer never invents one for a
 *   money-moving write — only for the session refresh, whose replay semantics
 *   it owns.
 * - **Verified backend only.** `verifyBackendIdentity()` runs before the request is built from the customer's cookies:
 *   a backend that answers as another store (or cannot be verified) gets nothing, and the browser gets a plain 503.
 * - `no-store`, always. Nothing transactional is ever cached (MDS §5).
 */

export interface ShopRequestOptions {
  params?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  /** Forward the refresh token too (refresh and logout only). */
  withRefresh?: boolean;
  /** Skip the expired-session guard (the auth routes themselves). */
  allowExpired?: boolean;
  idempotencyKey?: string;
  /** A guest order's tracking credential (backend `x-order-access-token`), relayed from the browser's request header. */
  orderAccessToken?: string;
}

export interface ShopResult<T = unknown> {
  status: number;
  data: T | undefined;
}

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,128}$/;

/**
 * The customer's address, for the backend's per-IP rate limits. Only a value a
 * TRUSTED proxy wrote is believed: the RIGHT-most `x-forwarded-for` entry (the
 * one the nearest proxy appended — everything to its left is whatever the
 * client sent, and the first entry is entirely client-controlled), and
 * `x-real-ip` only when `TRUST_X_REAL_IP=1` says the proxy overwrites it.
 * Trusting the left-most entry would let a caller rotate it per request and
 * walk past every IP limit.
 */
function forwardedFor(request: Request): string | undefined {
  if (process.env.TRUST_X_REAL_IP === "1") {
    const real = request.headers.get("x-real-ip")?.trim();
    if (real) return real;
  }
  const hops = request.headers.get("x-forwarded-for")?.split(",").map((hop) => hop.trim()).filter(Boolean);
  return hops?.at(-1);
}

function localeOf(request: Request): "ar" | "en" {
  return request.headers.get("x-store-locale") === "en" ? "en" : "ar";
}

const EXPIRED = { statusCode: 401, error: "UNAUTHORIZED", message: "Session expired." };

export async function shopRequest<T = unknown>(request: Request, endpoint: ShopEndpoint, options: ShopRequestOptions = {}): Promise<ShopResult<T>> {
  const held = await readSessionCookies();
  if (!options.allowExpired && held.marker && !held.session) return { status: 401, data: EXPIRED as T };

  const headers: Record<string, string> = { Accept: "application/json", "Accept-Language": localeOf(request) };
  const cookie = backendCookieHeader({ session: held.session, refresh: options.withRefresh ? held.refresh : undefined });
  if (cookie) headers.Cookie = cookie;
  if (held.cart) headers["x-cart-token"] = held.cart;
  const access = options.orderAccessToken ?? request.headers.get("x-order-access-token") ?? undefined;
  if (access) {
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(access)) return { status: 404, data: { statusCode: 404, error: "NOT_FOUND", message: "Order not found." } as T };
    headers["x-order-access-token"] = access;
  }
  const ip = forwardedFor(request);
  if (ip) headers["x-forwarded-for"] = ip;

  const key = options.idempotencyKey ?? request.headers.get("idempotency-key") ?? undefined;
  if (key) {
    if (!IDEMPOTENCY_KEY.test(key)) return { status: 400, data: { statusCode: 400, error: "BAD_REQUEST", message: "Invalid Idempotency-Key." } as T };
    headers["Idempotency-Key"] = key;
  }

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) body = options.body;
  else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  // Before anything is sent: the customer's cookies and cart token must not reach a backend that is not this store's.
  try {
    await verifyBackendIdentity();
  } catch (error) {
    if (!(error instanceof BackendIdentityError)) throw error;
    return { status: 503, data: { statusCode: 503, error: "SERVICE_UNAVAILABLE", message: "The store is temporarily unavailable." } as T };
  }

  const url = joinUrl(joinUrl(staffApiUrl(), "api/shop"), buildUrl(endpoint.url, options.params, options.query as Record<string, string>));
  let response: Response;
  try {
    response = await fetch(url, { method: endpoint.methodType, headers, body, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  } catch (error) {
    console.error(`[session] ${endpoint.methodType} ${endpoint.url} could not reach the backend:`, error instanceof Error ? error.message : error);
    return { status: 503, data: { statusCode: 503, error: "SERVICE_UNAVAILABLE", message: "The store is temporarily unavailable." } as T };
  }

  const change = sessionChangeFrom(response.headers.getSetCookie());
  if (change?.cleared) await clearSession();
  else if (change) await writeSession(change);

  const text = await response.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { statusCode: response.status, message: text };
    }
  }

  // The guest cart credential never reaches the browser.
  if (data && typeof data === "object" && "cartToken" in data) {
    const { cartToken, ...rest } = data as { cartToken?: string };
    if (cartToken) await writeCartToken(cartToken);
    data = rest;
  }

  return { status: response.status, data: data as T };
}

/** The BFF's response: the backend's status and (already canonical) body, unchanged. */
export function toResponse(result: ShopResult): NextResponse {
  if (result.status === 204 || result.data === undefined) return new NextResponse(null, { status: result.status === 200 ? 204 : result.status });
  return NextResponse.json(result.data, { status: result.status, headers: { "Cache-Control": "no-store" } });
}

/** After a merge or a sign-out the guest cart token has served its purpose. */
export { clearCartToken };

/** Reads a JSON body the browser sent; an unparsable one is forwarded as `{}` so the backend's validation answers. */
export async function jsonBody(request: Request): Promise<unknown> {
  return request.json().catch(() => ({}));
}
