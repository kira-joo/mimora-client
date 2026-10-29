import { assertBuildEnvironment, assertProductionEnvironment } from "@/lib/config/env-validation";
import { configurationGaps } from "@/lib/config/startup-check";

/**
 * Boot-time configuration gate and announcement (workspace CLAUDE.md: "a capability
 * that is configured OFF must say so once, at startup, in production, loudly").
 *
 *  - **Production build:** `SITE_URL` must be usable or the build throws. Nothing
 *    else is checked — `next build` runs without a backend by design.
 *  - **Production boot:** a missing or unusable REQUIRED variable (`STAFF_API_URL`,
 *    `SITE_URL`, `STORE_TIMEZONE`) stops the process with a message naming it, never
 *    its value (`STORE_ID` included — it must equal the backend's). A capability that is OFF (`REVALIDATE_SECRET`) is announced by
 *    `configurationGaps`, unchanged.
 *  - **Production boot, backend identity:** one attempt to verify `STAFF_API_URL` answers as `STORE_ID`
 *    (`backend-identity.ts`); logs `[identity] verified store 'x'`, or an error on a mismatch. Never crashes the boot.
 *  - Elsewhere: silent.
 */
export async function register() {
  if (process.env.NODE_ENV !== "production") return;

  if (process.env.NEXT_PHASE === "phase-production-build") {
    assertBuildEnvironment(process.env, process.env.NODE_ENV);
    return;
  }

  for (const notice of assertProductionEnvironment(process.env, process.env.NODE_ENV)) {
    (notice.level === "error" ? console.error : console.warn)(notice.message);
  }
  for (const gap of configurationGaps(process.env)) console.error(`[config] ${gap}`);

  // One attempt to verify the backend is this store's, logged either way. Not awaited and never fatal: an unreachable
  // backend is verified again on the first request, and a mismatch is already refused (and logged loudly) there.
  // Node runtime only: the check uses node:http(s), and the guard lets Next strip the import from the Edge bundle.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { announceBackendIdentity } = await import("@/lib/config/backend-identity");
    void announceBackendIdentity();
  }
}
