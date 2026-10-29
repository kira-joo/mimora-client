"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Store-wide values the client needs and the server already resolved from the
 * profile: the currency (one per deployment, carried by the profile — never
 * part of an amount) and the time zone. Data, never constants (MDS §17).
 */
interface StoreContextValue {
  currency: string;
  timeZone: string;
  storeName: { ar: string; en: string };
  allowVisitorGround: boolean;
  /** The locales the store serves (profile `supportedLocales`), for the locale switch. Absent means every shipped locale. */
  supportedLocales?: readonly string[];
}

// Neutral defaults (ISO 4217 "no currency", UTC): the layout always provides the real values from the store profile.
const StoreContext = createContext<StoreContextValue>({ currency: "XXX", timeZone: "UTC", storeName: { ar: "", en: "" }, allowVisitorGround: false });

export function StoreProvider({ value, children }: { value: StoreContextValue; children: ReactNode }) {
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);
export const useCurrency = () => useContext(StoreContext).currency;
