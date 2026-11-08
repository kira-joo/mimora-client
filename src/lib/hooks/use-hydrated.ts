"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` for the server render and the hydration pass, `true` once the client has hydrated. Use it to hold back
 * UI that must not be part of the server HTML (so it is not baked into a cached page) without a hydration mismatch.
 * An external-store read rather than an effect that sets a flag: no extra render pass after mount.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
