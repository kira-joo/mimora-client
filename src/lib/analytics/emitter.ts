import { analyticsAllowed, type ConsentState } from "./consent";
import { findPii, type AnalyticsEvent } from "./events";

/*
 * The one place an event leaves the app: pushed onto `window.dataLayer`, and ONLY
 * after the visitor has consented to analytics. Before that it is a no-op — and
 * it says so. A capability that is switched off must be distinguishable from one
 * that works (CLAUDE.md, "a deliberate no-op must be observable"), so in development
 * the first dropped event logs, once, that analytics is OFF and why.
 *
 * Provider-agnostic: `dataLayer` is the hand-off. Whatever reads it (a tag manager,
 * a first-party collector) is the merchant's choice, and adding a THIRD-PARTY one is
 * the trigger to revisit the cookies page (legal-and-consent.md §3), not a code
 * change here.
 */
export interface EmitterEnvironment {
  consent(): ConsentState;
  /** The page's `window`, or undefined during server rendering. */
  target(): { dataLayer?: unknown[] } | undefined;
  /** True in development builds — controls the OFF announcement. */
  dev: boolean;
  log?: Pick<Console, "info" | "error">;
}

export function createEmitter(environment: EmitterEnvironment) {
  let announcedOff = false;
  const log = environment.log ?? console;

  return function track(event: AnalyticsEvent): boolean {
    const target = environment.target();
    if (!target) return false;

    if (!analyticsAllowed(environment.consent())) {
      if (environment.dev && !announcedOff) {
        announcedOff = true;
        log.info("[analytics] OFF — the visitor has not consented to analytics, so events are dropped and nothing is pushed to window.dataLayer.");
      }
      return false;
    }

    const findings = findPii(event.params);
    if (findings.length > 0) {
      // A bug, not a runtime condition: loud in development, and the event is refused everywhere.
      if (environment.dev) log.error(`[analytics] refused "${event.name}": personal data in the payload (${findings.join(", ")}).`);
      return false;
    }

    (target.dataLayer ??= []).push({ event: event.name, ...event.params });
    return true;
  };
}
