"use client";

import { readConsent } from "./consent-store";
import { createEmitter } from "./emitter";
import type { AnalyticsEvent } from "./events";

/**
 * The emitter bound to the real browser: it reads the stored consent on EVERY event
 * (so a choice made — or withdrawn — a second ago applies to the very next one) and
 * pushes to `window.dataLayer`. Call from event handlers and effects, never during render.
 */
export const track: (event: AnalyticsEvent) => boolean = createEmitter({
  consent: readConsent,
  target: () => (typeof window === "undefined" ? undefined : (window as unknown as { dataLayer?: unknown[] })),
  dev: process.env.NODE_ENV === "development",
});
