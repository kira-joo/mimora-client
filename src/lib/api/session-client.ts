"use client";

import axios from "axios";
import { createApiClient, type ApiClient } from "@kira-joo/frontend-toolkit-core/server";
import { createAxiosAdapter } from "./axios-adapter";
import { SessionEndpoints } from "./session.endpoints";

/**
 * The browser's only client: this app's own origin, Axios transport, cookies
 * attached by the browser (same-origin). Nothing here reads, stores or attaches
 * a token — they are httpOnly and the BFF forwards them (MDS §7).
 *
 * Refresh-on-401 is the toolkit's single-flight: five queries failing together
 * start ONE refresh, never five (five would present an already-rotated token,
 * trip reuse detection and sign the customer out for doing nothing wrong).
 * The refresh call itself skips the refresh path.
 *
 * `x-store-locale` tells the BFF which language to ask the backend for — the
 * page's locale, not the browser's Accept-Language.
 */
let client: ApiClient | undefined;
let onSessionEnded: (() => void) | undefined;

export function setSessionEndedHandler(handler: () => void) {
  onSessionEnded = handler;
}

export function sessionApi(): ApiClient {
  client ??= createApiClient({
    baseURL: "/api/session",
    adapter: createAxiosAdapter(axios.create({ withCredentials: false })),
    timeoutMs: 20_000,
    dynamicHeaders: () => ({ "x-store-locale": typeof document === "undefined" ? "ar" : document.documentElement.lang === "en" ? "en" : "ar" }),
    refreshAuth: () => acrossTabs(async () => {
      try {
        await client!.request(SessionEndpoints.refresh, { skipAuthRefresh: true });
        return true;
      } catch {
        return false;
      }
    }),
    // The session could not be renewed: drop to guest. Never a redirect — guests are first-class.
    onUnauthorized: () => onSessionEnded?.(),
  });
  return client;
}

/**
 * The toolkit's single-flight is per client — per TAB. Two tabs refreshing at
 * once would present the same refresh token twice; the second is reuse, and
 * reuse detection revokes the whole family (both tabs signed out for nothing).
 * A Web Lock serialises refresh across every tab of this origin: the waiting
 * tab refreshes after the first has rotated the cookie, so it presents the NEW
 * token — not reuse. Browsers without Web Locks fall back to per-tab single-flight.
 */
function acrossTabs<T>(task: () => Promise<T>): Promise<T> {
  // The lock resolves to the task's own value (a returned promise is awaited), whatever the DOM typing says.
  if (typeof navigator !== "undefined" && "locks" in navigator) return navigator.locks.request("sf-session-refresh", task) as unknown as Promise<T>;
  return task();
}

/** Live catalog reads on this origin (`/api/catalog/**`) — anonymous, no-store, no refresh path. */
let catalog: ApiClient | undefined;
export function catalogApi(): ApiClient {
  catalog ??= createApiClient({ baseURL: "/api/catalog", adapter: createAxiosAdapter(axios.create()), timeoutMs: 10_000 });
  return catalog;
}

/** A fresh key per user action; a retry of the SAME action reuses it so the server replays instead of repeating. */
export function newIdempotencyKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
