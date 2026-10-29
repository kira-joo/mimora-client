"use client";

import { useSyncExternalStore } from "react";
import { CONSENT_STORAGE_KEY, CONSENT_UNSET, parseConsent, serializeConsent, type ConsentChoice, type ConsentState } from "./consent";

/*
 * The browser end of the consent choice: `localStorage`, plus a tiny pub/sub so the
 * notice, the footer link and the emitter (all separate components, and the emitter
 * not a component at all) see one answer at once — including a change made in another
 * tab (the `storage` event). Storage can be blocked: then the choice lasts for this
 * page view only (held in memory) and the notice returns next visit — never an error,
 * and never "granted" by default.
 */
const CHANGE_EVENT = "sf-consent-change";
const OPEN_EVENT = "sf-consent-open";

/** Used ONLY when storage throws: the choice then lasts for this page view. */
let memory: string | null = null;
let cachedRaw: string | null | undefined;
let cachedState: ConsentState = CONSENT_UNSET;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return memory;
  }
}

/** The current choice. The same object is returned until the stored value changes (a stable snapshot for React). */
export function readConsent(): ConsentState {
  if (typeof window === "undefined") return CONSENT_UNSET;
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedState = parseConsent(raw);
  }
  return cachedState;
}

export function writeConsent(choice: ConsentChoice): void {
  const raw = serializeConsent(choice);
  memory = raw;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, raw);
  } catch {
    /* storage blocked — held in memory for this page view */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeConsent(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === CONSENT_STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Asks the notice to open again so the visitor can change their mind (the footer's "Cookie settings"). */
export function openConsentSettings(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onConsentSettingsOpen(listener: () => void): () => void {
  window.addEventListener(OPEN_EVENT, listener);
  return () => window.removeEventListener(OPEN_EVENT, listener);
}

/** The server and the first client render both see `unset`, so the notice never mismatches hydration. */
export function useConsent(): ConsentState {
  return useSyncExternalStore(subscribeConsent, readConsent, () => CONSENT_UNSET);
}
