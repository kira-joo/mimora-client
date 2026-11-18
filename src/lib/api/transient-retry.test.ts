import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdapterRequest, AdapterResponse } from "@kira-joo/frontend-toolkit-core/server";

vi.mock("server-only", () => ({}));

const { sendWithTransientRetry } = await import("./transient-retry");
const { BackendIdentityError } = await import("../config/backend-identity");

const request = (method = "GET", extra: Partial<AdapterRequest> = {}) => ({ url: "http://backend.test/api/storefront/products?limit=24", method, headers: {}, ...extra }) as unknown as AdapterRequest;
const ok = (status = 200) => ({ status, statusText: "", headers: {}, data: { ok: true } }) as unknown as AdapterResponse;
const timeout = () => Object.assign(new DOMException("Request timed out", "TimeoutError"));
const network = () => new TypeError("fetch failed");

/** A sender that plays back the given outcomes in order: a response, or an error to throw. */
function scripted(...outcomes: Array<AdapterResponse | Error>) {
  const send = vi.fn(async () => {
    const next = outcomes.shift();
    if (next instanceof Error || next instanceof DOMException) throw next;
    return next!;
  });
  return send;
}

const logs: string[] = [];
const opts = { delayMs: 1, log: (message: string) => logs.push(message) };
beforeEach(() => {
  logs.length = 0;
});

describe("sendWithTransientRetry — retried once", () => {
  it.each([
    ["a timeout (no response)", timeout()],
    ["a network failure (no response)", network()],
    ["an unreachable backend during the identity check", new BackendIdentityError("unreachable", true)],
  ])("%s, then succeeds", async (_label, failure) => {
    const send = scripted(failure as Error, ok());
    await expect(sendWithTransientRetry(request(), send, opts)).resolves.toMatchObject({ status: 200 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(logs).toHaveLength(1);
  });

  it.each([502, 503, 504])("an HTTP %i from the platform, then succeeds", async (status) => {
    const send = scripted(ok(status), ok());
    await expect(sendWithTransientRetry(request(), send, opts)).resolves.toMatchObject({ status: 200 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(logs[0]).toContain(`HTTP ${status}`);
  });

  it("only once: a second failure surfaces to the caller (orNull / the page decides)", async () => {
    const send = scripted(timeout(), timeout());
    await expect(sendWithTransientRetry(request(), send, opts)).rejects.toMatchObject({ name: "TimeoutError" });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("logs the path only — never the backend's origin", async () => {
    await sendWithTransientRetry(request(), scripted(timeout(), ok()), opts);
    expect(logs[0]).toBe("[storefront-api] GET /api/storefront/products?limit=24 — timed out; retrying once in 1 ms.");
    expect(logs[0]).not.toContain("backend.test");
  });
});

describe("sendWithTransientRetry — never retried", () => {
  it.each(["POST", "PUT", "DELETE"])("a %s, even on a timeout", async (method) => {
    const send = scripted(timeout(), ok());
    await expect(sendWithTransientRetry(request(method), send, opts)).rejects.toMatchObject({ name: "TimeoutError" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it.each([400, 404, 409, 500])("an HTTP %i (deterministic, or a bug to surface)", async (status) => {
    const send = scripted(ok(status), ok());
    await expect(sendWithTransientRetry(request(), send, opts)).resolves.toMatchObject({ status });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("a backend that answered as the WRONG store", async () => {
    const send = scripted(new BackendIdentityError("wrong store", false), ok());
    await expect(sendWithTransientRetry(request(), send, opts)).rejects.toBeInstanceOf(BackendIdentityError);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("a request its caller aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const send = scripted(new DOMException("aborted", "AbortError"), ok());
    await expect(sendWithTransientRetry(request("GET", { signal: controller.signal }), send, opts)).rejects.toMatchObject({ name: "AbortError" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("an unexpected error (not a transport failure)", async () => {
    const send = scripted(new Error("boom"), ok());
    await expect(sendWithTransientRetry(request(), send, opts)).rejects.toThrow("boom");
    expect(send).toHaveBeenCalledTimes(1);
    expect(logs).toHaveLength(0);
  });
});

describe("through the real storefront client", () => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const isIdentity = (url: unknown) => String(url).endsWith("/api/storefront/identity");
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("STAFF_API_URL", "http://backend.test");
    vi.stubEnv("STORE_ID", "store-a");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("a catalog read whose first attempt times out (a cold backend) resolves on the retry", async () => {
    let catalogAttempts = 0;
    fetchMock = vi.fn(async (url: unknown) => {
      if (isIdentity(url)) return json({ storeId: "store-a" });
      catalogAttempts += 1;
      if (catalogAttempts === 1) throw new DOMException("Request timed out", "TimeoutError");
      return json([{ id: "c1" }]);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { storefrontApi } = await import("./storefront-client");
    const { StorefrontEndpoints } = await import("./storefront.endpoints");
    await expect(storefrontApi().request(StorefrontEndpoints.categories)).resolves.toEqual([{ id: "c1" }]);
    expect(catalogAttempts).toBe(2);
  });

  it("the retry keeps the read's own cache config (Data Cache tags and revalidate)", async () => {
    let attempts = 0;
    const seen: unknown[] = [];
    fetchMock = vi.fn(async (url: unknown, init: { next?: unknown }) => {
      if (isIdentity(url)) return json({ storeId: "store-a" });
      seen.push(init?.next);
      attempts += 1;
      if (attempts === 1) throw new TypeError("fetch failed");
      return json([]);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { storefrontApi } = await import("./storefront-client");
    const { StorefrontEndpoints } = await import("./storefront.endpoints");
    await storefrontApi().request(StorefrontEndpoints.categories, { transport: { next: { tags: ["categories"], revalidate: 300 } } });
    expect(seen).toEqual([{ tags: ["categories"], revalidate: 300 }, { tags: ["categories"], revalidate: 300 }]);
  });
});
