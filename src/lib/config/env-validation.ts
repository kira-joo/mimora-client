/**
 * The one declaration of every environment variable the storefront reads.
 *
 * Each variable is declared once — whether the process may run without it,
 * whether its value is a secret, and how to tell a usable value from an unusable
 * one — and `env-inventory.test.ts` fails when `src` reads a variable this table
 * does not declare, so a new one cannot slip in undocumented.
 *
 * ## Tiers, and what each does
 *
 *  - **required** — a deployment without it cannot serve the store. At **boot** in
 *    production a missing or unusable one stops the process
 *    (`assertProductionEnvironment`); `SITE_URL` additionally stops the production
 *    BUILD (`assertBuildEnvironment`), so a deploy without it fails loudly instead
 *    of shipping absolute URLs that point at nothing. Messages carry names and
 *    reasons, never a value.
 *  - **capability** — switches a feature on (cache invalidation). Absent is
 *    announced once at boot by `configurationGaps` (`startup-check.ts`, unchanged);
 *    set-but-unusable is an `error` notice here. Never fatal.
 *  - **optional** — has a safe default; validated only when set.
 *
 * `provided` variables are set by the runtime and exist here only so the
 * inventory is whole.
 *
 * Pure: `env` is a parameter. No `server-only` import, so tests and
 * `instrumentation.ts` can use it freely. Mirrors
 * `store-platform-staff/src/server/core/config/env-validation.ts`; the two are
 * separate repositories and each owns the variables it reads.
 */
export type EnvRequirement = "required" | "capability" | "optional" | "provided";

type Env = Record<string, string | undefined>;

export interface EnvVarSpec {
  name: string;
  requirement: EnvRequirement;
  secret: boolean;
  description: string;
  /** Why the VALUE is unusable (never the value), or `null`. Called only when the variable is set. A problem for `required`, an error notice otherwise. */
  validate?: (value: string, context: { production: boolean }) => string | null;
  /** Something worth saying about a usable value (a warning notice, never fatal). */
  advisory?: (value: string, context: { production: boolean }) => string | null;
}

const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_PREFIX = "replace-with";

function timeZoneProblem(value: string): string | null {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value.trim() });
    return null;
  } catch {
    return "is not a recognised IANA time zone (e.g. Africa/Cairo)";
  }
}

/**
 * A loopback origin is exempt from the https-in-production rule: a production build served on this machine (CI's
 * configuration proof, a local smoke run) is legitimate, and no real deployment can be reached at loopback, so the
 * exemption cannot let a public deploy go out over plain http.
 */
function isLoopback(url: URL): boolean {
  return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
}

function parseHttp(value: string): URL | string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "must be an absolute URL";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "must be an http(s) URL";
  return url;
}

/** Why `SITE_URL` is unusable, or `null`. Exported: `siteOrigin()` throws with it at build. */
export function siteUrlProblem(value: string | undefined, production: boolean): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return "is not set";
  const url = parseHttp(trimmed);
  if (typeof url === "string") return url;
  if (production && url.protocol !== "https:" && !isLoopback(url)) return "must be https in production";
  if (url.search || url.hash) return "must not carry a query string or fragment";
  return null;
}

/**
 * A store id is a slug: lowercase letters, digits and hyphens, 1-40 characters, no leading or trailing hyphen. The same
 * pattern is enforced by the backend's own `STORE_ID`; the two values must be equal (the storefront verifies it
 * against the backend's `/api/storefront/identity` — `backend-identity.ts`).
 */
export const STORE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

/** Why `STORE_ID` is unusable (never the value), or `null`. */
export function storeIdProblem(value: string): string | null {
  return STORE_ID_PATTERN.test(value) ? null : "must be a lowercase slug (a-z, 0-9 and hyphens; 1-40 characters; no leading or trailing hyphen)";
}

export const ENV_VARS: readonly EnvVarSpec[] = [
  { name: "NODE_ENV", requirement: "provided", secret: false, description: "Set by Next (`production` under `next start`). Never set it by hand." },
  { name: "NEXT_PHASE", requirement: "provided", secret: false, description: "Set by Next; distinguishes `next build` from a running server." },
  { name: "NEXT_RUNTIME", requirement: "provided", secret: false, description: "Set by Next (`nodejs` or `edge`); instrumentation runs the backend-identity check only on nodejs." },
  { name: "VITEST", requirement: "provided", secret: false, description: "Set by the test runner only; selects the test transport in backend-identity. Never set it in a deployment." },

  {
    name: "STAFF_API_URL",
    requirement: "required",
    secret: false,
    description: "The backend's origin. SERVER-ONLY — never NEXT_PUBLIC_: the browser must never learn it.",
    validate: (value) => {
      const url = parseHttp(value);
      return typeof url === "string" ? url : null;
    },
    advisory: (value, { production }) => {
      const url = parseHttp(value);
      return production && typeof url !== "string" && url.protocol === "http:" && !isLoopback(url) ? "is plain http — acceptable only across a private network" : null;
    },
  },
  {
    name: "SITE_URL",
    requirement: "required",
    secret: false,
    description: "This storefront's public origin, https in production. Throws at production build when missing. Not NEXT_PUBLIC_.",
    validate: (value, { production }) => {
      const problem = siteUrlProblem(value, production);
      return problem === "is not set" ? null : problem;
    },
  },
  {
    name: "STORE_ID",
    requirement: "required",
    secret: false,
    description: "This deployment's store id (a slug). Must equal the backend's STORE_ID: the storefront refuses to read from or send to a backend that answers as a different store.",
    validate: storeIdProblem,
  },
  { name: "STORE_TIMEZONE", requirement: "required", secret: false, description: "The store's IANA time zone. Must equal the backend's value.", validate: timeZoneProblem },
  {
    name: "REVALIDATE_SECRET",
    requirement: "capability",
    secret: true,
    description: "Cache-invalidation secret shared with the backend (X-Revalidate-Secret). Unset: invalidation is OFF.",
    validate: (value, { production }) => {
      if (value.length < MIN_SECRET_LENGTH) return `must be at least ${MIN_SECRET_LENGTH} characters (openssl rand -base64 48)`;
      if (production && value.toLowerCase().startsWith(PLACEHOLDER_PREFIX)) return "is still the placeholder from .env.example";
      return null;
    },
  },
  { name: "TRUST_X_REAL_IP", requirement: "optional", secret: false, description: "1 only behind a proxy that overwrites X-Real-IP.", validate: (value) => (value === "1" || value === "0" ? null : "must be 1 or unset") },
  { name: "DESIGN_PREVIEW", requirement: "optional", secret: false, description: "1 serves /preview in a production build. Leave unset in production.", advisory: (value, { production }) => (production && value === "1" ? "is on — the internal design preview is publicly reachable" : null) },
];

export const ENV_VAR_NAMES: ReadonlySet<string> = new Set(ENV_VARS.map((spec) => spec.name));

/** Names that would hand the backend's origin to the browser. Declared nowhere on purpose; presence is a mistake. */
const BROWSER_VISIBLE_BACKEND_NAMES = ["NEXT_PUBLIC_STAFF_API_URL", "NEXT_PUBLIC_SHOP_API_URL", "NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_BACKEND_URL"] as const;

const clean = (value: string | undefined) => value?.trim() || undefined;

export interface EnvNotice {
  level: "error" | "warn";
  message: string;
}

export interface EnvironmentReport {
  problems: string[];
  notices: EnvNotice[];
}

export function validateEnvironment(env: Env, { production }: { production: boolean }): EnvironmentReport {
  const problems: string[] = [];
  const notices: EnvNotice[] = [];

  for (const spec of ENV_VARS) {
    if (spec.requirement === "provided") continue;
    const value = clean(env[spec.name]);
    if (!value) {
      if (spec.requirement === "required") problems.push(`${spec.name}: is not set`);
      continue;
    }
    const reason = spec.validate?.(value, { production }) ?? null;
    if (reason) {
      if (spec.requirement === "required") problems.push(`${spec.name}: ${reason}`);
      else notices.push({ level: "error", message: `[config] ${spec.name} ${reason} — the capability it configures will not work as intended.` });
      continue;
    }
    const advice = spec.advisory?.(value, { production }) ?? null;
    if (advice) notices.push({ level: "warn", message: `[config] ${spec.name} ${advice}.` });
  }

  for (const name of BROWSER_VISIBLE_BACKEND_NAMES) {
    if (clean(env[name])) notices.push({ level: "error", message: `[config] ${name} is set — a NEXT_PUBLIC_ variable is bundled into browser JavaScript, which must never learn the backend's origin. Use STAFF_API_URL (server-only) and remove it.` });
  }

  return { problems, notices };
}

export class EnvironmentConfigurationError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[], phase: "boot" | "build" = "boot") {
    super(
      `Invalid production configuration at ${phase} — ${problems.length} problem${problems.length === 1 ? "" : "s"}:\n` +
        problems.map((problem) => `  - ${problem}`).join("\n") +
        "\nValues are never printed. See docs/configuration.md and docs/deployment.md."
    );
    this.name = "EnvironmentConfigurationError";
    this.problems = problems;
  }
}

/**
 * Production boot gate. Throws when a REQUIRED variable is missing or unusable;
 * outside production does nothing. Returns notices for the caller to announce.
 */
export function assertProductionEnvironment(env: Env, nodeEnv: string | undefined): EnvNotice[] {
  const production = nodeEnv === "production";
  const report = validateEnvironment(env, { production });
  if (production && report.problems.length > 0) throw new EnvironmentConfigurationError(report.problems);
  return report.notices;
}

/**
 * Production BUILD gate: only what a build bakes in. `next build` runs without a
 * backend by design, so `STAFF_API_URL` is NOT checked here — but `SITE_URL` is
 * baked into `metadataBase`, the sitemap and robots, and a wrong one ships
 * silently. Throws in a production build; nothing otherwise.
 */
export function assertBuildEnvironment(env: Env, nodeEnv: string | undefined): void {
  if (nodeEnv !== "production") return;
  const problem = siteUrlProblem(env.SITE_URL, true);
  if (problem) throw new EnvironmentConfigurationError([`SITE_URL: ${problem}`], "build");
}
