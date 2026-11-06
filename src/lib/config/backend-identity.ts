import "server-only";
import { joinUrl } from "@kira-joo/frontend-toolkit-core/server";
import { storeIdProblem } from "./env-validation";
import { staffApiUrl } from "./server-env";

/**
 * Is `STAFF_API_URL` really THIS store's backend?
 *
 * One deployment serves one store, and nothing else ties a storefront to its backend: a pasted URL, a copied
 * environment or a preview pointed at the wrong service would render and take orders against another merchant's
 * catalog, silently. The backend answers `GET /api/storefront/identity` with the `STORE_ID` it has verified against
 * its own database; this module compares that with this deployment's `STORE_ID` and refuses on any difference.
 *
 * **Called before EVERY backend call** (`storefront-client.ts` for catalog reads, `shop-request.ts` for the cart,
 * checkout and account BFF), so no request is sent to, and no response is used from, an unverified backend. Success
 * is memoised for the life of the process, so after the first answer it costs nothing; a failure is never memoised,
 * so a backend that was down at first contact is checked again on the next call.
 *
 *  - **Mismatch** → `BackendIdentityError` (not retryable), logged loudly once per distinct answer.
 *  - **Unreachable, non-2xx, or unparsable** → `BackendIdentityError` (retryable). To a caller this is "the backend is
 *    down", so the existing absent-state handling applies: catalog reads degrade through `orNull` (D-15), and a
 *    `next build` without a backend still succeeds.
 *  - **`STORE_ID` unset** → in production a (non-retryable) error — boot refuses to start without it, so this is only
 *    reachable in a build; elsewhere verification is skipped with a one-time warning so local development and unit
 *    tests keep working.
 */
export class BackendIdentityError extends Error {
  /** True when asking again may succeed (the backend was unreachable); false when the answer was wrong. */
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "BackendIdentityError";
    this.retryable = retryable;
  }
}

const IDENTITY_PATH = "api/storefront/identity";
const TIMEOUT_MS = 5_000;

let verified: { key: string; storeId: string } | undefined;
let inflight: { key: string; promise: Promise<string> } | undefined;
const logged = new Set<string>();
let warnedUnset = false;

function logOnce(message: string) {
  if (logged.has(message)) return;
  logged.add(message);
  console.error(message);
}

/** A value from the network, made safe to put in a log line and an error message. */
function printable(value: unknown): string {
  return String(value).replace(/[^\x20-\x7E]/g, "?").slice(0, 64);
}

/** The status and raw body of the identity answer — all `askBackend` needs, from whichever transport. */
interface IdentityAnswer {
  status: number;
  body: string;
}

/**
 * The production transport: a plain `node:http(s)` request, deliberately NOT `fetch`. Next patches `globalThis.fetch`,
 * and the patched one treats `cache: "no-store"` during a static render as "this page is dynamic" — which would
 * silently turn every ISR catalog page dynamic the first time the identity check ran inside one, and lose ISR (the
 * one thing that keeps the database off the request path). A Node request is outside that patching by construction,
 * so it depends on no Next internal and survives Next upgrades. Never cached; 5 s timeout.
 */
async function nodeTransport(url: string): Promise<IdentityAnswer> {
  const { request } = url.startsWith("https:") ? await import("node:https") : await import("node:http");
  return new Promise((resolve, reject) => {
    const req = request(url, { method: "GET", headers: { Accept: "application/json" }, timeout: TIMEOUT_MS }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error(`timed out after ${TIMEOUT_MS} ms`)));
    req.on("error", reject);
    req.end();
  });
}

/** The test transport: routes through `globalThis.fetch`, which the unit tests stub. Selected under vitest (below). */
async function fetchTransport(url: string): Promise<IdentityAnswer> {
  const response = await globalThis.fetch(url, { cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  return { status: response.status, body: await response.text() };
}

// Under vitest (which sets VITEST) the request goes through `fetch`, which the unit tests stub; everywhere else, Node.
const transport: (url: string) => Promise<IdentityAnswer> = process.env.VITEST ? fetchTransport : nodeTransport;

async function askBackend(base: string, expected: string): Promise<string> {
  let answer: IdentityAnswer;
  try {
    answer = await transport(joinUrl(base, IDENTITY_PATH));
  } catch (error) {
    throw new BackendIdentityError(`the backend's identity endpoint could not be reached (${error instanceof Error ? error.message : "network error"}).`, true);
  }
  if (answer.status < 200 || answer.status > 299) throw new BackendIdentityError(`the backend's identity endpoint answered ${answer.status}.`, true);

  let body: unknown;
  try {
    body = JSON.parse(answer.body);
  } catch {
    throw new BackendIdentityError("the backend's identity endpoint answered with a body that is not JSON.", true);
  }
  const actual = (body as { storeId?: unknown } | null)?.storeId;
  if (typeof actual !== "string" || !actual) {
    throw new BackendIdentityError("the backend's identity endpoint answered without a storeId.", true);
  }

  if (actual !== expected) {
    const message = `[identity] this storefront is configured as store '${expected}' but STAFF_API_URL answers as store '${printable(actual)}' — refusing to send anything to, or use anything from, that backend. Fix STORE_ID or STAFF_API_URL.`;
    logOnce(message);
    throw new BackendIdentityError(message, false);
  }
  return actual;
}

/**
 * Resolves with the verified store id, or `null` when verification was skipped (non-production, `STORE_ID` unset).
 * Rejects with `BackendIdentityError` — never with a partial success.
 */
export async function verifyBackendIdentity(): Promise<string | null> {
  const expected = process.env.STORE_ID?.trim();
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      const message = "[identity] STORE_ID is not set — the backend's identity cannot be verified, so no request is made to it. Set STORE_ID to this store's id (it must equal the backend's).";
      logOnce(message);
      throw new BackendIdentityError(message, false);
    }
    if (!warnedUnset) {
      warnedUnset = true;
      console.warn("[identity] STORE_ID is not set — backend identity is NOT being verified (development only; production requires it).");
    }
    return null;
  }

  const problem = storeIdProblem(expected);
  if (problem) {
    const message = `[identity] STORE_ID ${problem}.`;
    logOnce(message);
    throw new BackendIdentityError(message, false);
  }

  const base = staffApiUrl();
  const key = `${base}\n${expected}`;
  if (verified?.key === key) return verified.storeId;

  // Concurrent callers (a build prerenders many pages at once) share one request.
  if (inflight?.key !== key) {
    const promise: Promise<string> = askBackend(base, expected)
      .then((storeId) => {
        verified = { key, storeId };
        return storeId;
      })
      .finally(() => {
        if (inflight?.promise === promise) inflight = undefined;
      });
    inflight = { key, promise };
  }
  return inflight.promise;
}

/**
 * The production boot announcement (`instrumentation.ts`): one attempt, one log line, never a crash. A mismatch is
 * already logged loudly by `verifyBackendIdentity`; an unreachable backend is a warning, because the first request
 * verifies again. Never rejects.
 */
export async function announceBackendIdentity(): Promise<void> {
  try {
    const storeId = await verifyBackendIdentity();
    if (storeId) console.log(`[identity] verified store '${storeId}'`);
  } catch (error) {
    if (error instanceof BackendIdentityError && error.retryable) {
      console.warn(`[identity] could not verify the backend at boot — ${error.message} It is verified again on the first request; until then no backend call is made.`);
    } else if (!(error instanceof BackendIdentityError)) {
      console.error("[identity] verification failed unexpectedly:", error instanceof Error ? error.message : error);
    }
    // A non-retryable BackendIdentityError (mismatch, STORE_ID) was already logged loudly where it arose.
  }
}
