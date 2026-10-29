/*
 * The visitor's analytics choice (legal-and-consent.md §3-4): analytics is the one
 * browser-storage purpose that needs consent, so it is OFF until the visitor says
 * yes. Everything else the site stores (session, refresh, guest cart, theme, locale)
 * is strictly necessary or a preference the visitor set, and is not governed here.
 *
 * The choice is a first-party `localStorage` record carrying the VERSION of the
 * cookies text it was given against: when the legal text changes, `CONSENT_VERSION`
 * is bumped, every stored choice stops matching, and the visitor is asked again —
 * a "yes" to yesterday's wording is not a "yes" to today's. This module is pure
 * (parse/serialise/decide); the browser store is `consent-store.ts`.
 */

export const CONSENT_STORAGE_KEY = "sf-consent";

/**
 * Bump whenever the `cookies` page changes what is stored or why. A stored choice
 * made under another version is treated as no choice at all (the notice returns).
 */
export const CONSENT_VERSION = 1;

export type ConsentChoice = "granted" | "denied";
export type ConsentState = { status: "unset" } | { status: ConsentChoice; at: string };

export const CONSENT_UNSET: ConsentState = { status: "unset" };

/** What is stored for a choice. Never anything about the visitor — a version, a verdict and a time. */
export function serializeConsent(choice: ConsentChoice, now: Date = new Date(), version: number = CONSENT_VERSION): string {
  return JSON.stringify({ v: version, analytics: choice === "granted", at: now.toISOString() });
}

/**
 * Reads a stored record back. Anything malformed, from another version, or from the
 * old dismiss-only notice (`"1"`) is `unset` — the safe answer is always "ask", and
 * an unset state never allows analytics.
 */
export function parseConsent(raw: string | null | undefined, version: number = CONSENT_VERSION): ConsentState {
  if (!raw) return CONSENT_UNSET;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return CONSENT_UNSET;
    const { v, analytics, at } = value as { v?: unknown; analytics?: unknown; at?: unknown };
    if (v !== version || typeof analytics !== "boolean" || typeof at !== "string") return CONSENT_UNSET;
    return { status: analytics ? "granted" : "denied", at };
  } catch {
    return CONSENT_UNSET;
  }
}

/** The one question every emitter asks. Only an explicit, current "granted" allows analytics. */
export function analyticsAllowed(state: ConsentState): boolean {
  return state.status === "granted";
}

/** Should the notice be showing? Until there is a current choice, yes. */
export function needsChoice(state: ConsentState): boolean {
  return state.status === "unset";
}
