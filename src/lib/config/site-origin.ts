import "server-only";
import { EnvironmentConfigurationError, siteUrlProblem } from "./env-validation";

/**
 * This deployment's public origin (SITE_URL), for absolute URLs in metadata, the
 * sitemap and robots.
 *
 * - **Production build: throws** when it is missing or unusable. A build that
 *   defaulted would bake `metadataBase`, canonical links and the sitemap with an
 *   origin that points at nothing, and nothing would say so until a crawler did.
 * - Development falls back to the local dev server.
 * - A running production server with it unset returns `null` (the sitemap is left
 *   empty rather than full of wrong URLs); boot has already refused to start in
 *   that state (`instrumentation.ts`), so this is the belt to that brace.
 */
export function siteOrigin(): string | null {
  const value = process.env.SITE_URL?.trim().replace(/\/$/, "");
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE === "phase-production-build") {
    const problem = siteUrlProblem(value, true);
    if (problem) throw new EnvironmentConfigurationError([`SITE_URL: ${problem}`], "build");
  }
  if (value) return value;
  if (process.env.NODE_ENV !== "production") return "http://localhost:3030";
  return null;
}
