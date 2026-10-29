import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const IDENTITY_URL = "http://backend.test/api/storefront/identity";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;
let errorSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

async function load() {
  return import("./backend-identity");
}

beforeEach(() => {
  vi.resetModules();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("STAFF_API_URL", "http://backend.test");
  vi.stubEnv("STORE_ID", "store-a");
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("verifyBackendIdentity", () => {
  it("match: resolves with the store id, asks no-store, and asks only once across many calls", async () => {
    fetchMock.mockImplementation(async () => json({ storeId: "store-a" }));
    const { verifyBackendIdentity } = await load();

    await expect(verifyBackendIdentity()).resolves.toBe("store-a");
    for (let i = 0; i < 20; i++) await verifyBackendIdentity();
    // Concurrent callers before the first answer share the same request too.
    await Promise.all(Array.from({ length: 10 }, () => verifyBackendIdentity()));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(IDENTITY_URL);
    expect(init).toMatchObject({ cache: "no-store" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("concurrent first callers share one request", async () => {
    fetchMock.mockImplementation(async () => json({ storeId: "store-a" }));
    const { verifyBackendIdentity } = await load();
    await Promise.all(Array.from({ length: 10 }, () => verifyBackendIdentity()));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("mismatch: throws a clear, non-retryable error, logs loudly once per answer, and is never memoised", async () => {
    fetchMock.mockImplementation(async () => json({ storeId: "store-b" }));
    const { verifyBackendIdentity, BackendIdentityError } = await load();

    const failure = await verifyBackendIdentity().catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(BackendIdentityError);
    expect(failure).toMatchObject({ retryable: false });
    expect((failure as Error).message).toContain("this storefront is configured as store 'store-a' but STAFF_API_URL answers as store 'store-b'");

    await expect(verifyBackendIdentity()).rejects.toMatchObject({ retryable: false });
    expect(fetchMock).toHaveBeenCalledTimes(2); // asked again — a refusal is not remembered
    expect(errorSpy).toHaveBeenCalledTimes(1); // ...but logged once for this answer

    fetchMock.mockImplementation(async () => json({ storeId: "store-c" }));
    await expect(verifyBackendIdentity()).rejects.toThrow(/answers as store 'store-c'/);
    expect(errorSpy).toHaveBeenCalledTimes(2);
  });

  it("a backend that is later corrected is accepted (a mismatch is not sticky)", async () => {
    fetchMock.mockImplementationOnce(async () => json({ storeId: "store-b" })).mockImplementation(async () => json({ storeId: "store-a" }));
    const { verifyBackendIdentity } = await load();
    await expect(verifyBackendIdentity()).rejects.toThrow();
    await expect(verifyBackendIdentity()).resolves.toBe("store-a");
  });

  it("unreachable, non-2xx and unparsable answers throw a RETRYABLE error; the failure is not memoised", async () => {
    const { verifyBackendIdentity, BackendIdentityError } = await load();

    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    const unreachable = await verifyBackendIdentity().catch((error: unknown) => error);
    expect(unreachable).toBeInstanceOf(BackendIdentityError);
    expect(unreachable).toMatchObject({ retryable: true });

    fetchMock.mockResolvedValueOnce(json({ message: "nope" }, 404));
    await expect(verifyBackendIdentity()).rejects.toMatchObject({ retryable: true, message: expect.stringContaining("404") });

    fetchMock.mockResolvedValueOnce(json({ message: "boom" }, 503));
    await expect(verifyBackendIdentity()).rejects.toMatchObject({ retryable: true });

    fetchMock.mockResolvedValueOnce(new Response("<html>", { status: 200 }));
    await expect(verifyBackendIdentity()).rejects.toMatchObject({ retryable: true });

    fetchMock.mockResolvedValueOnce(json({ other: 1 }));
    await expect(verifyBackendIdentity()).rejects.toMatchObject({ retryable: true });

    // A later success works.
    fetchMock.mockResolvedValueOnce(json({ storeId: "store-a" }));
    await expect(verifyBackendIdentity()).resolves.toBe("store-a");
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("a timeout is retryable", async () => {
    fetchMock.mockRejectedValueOnce(Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }));
    const { verifyBackendIdentity } = await load();
    await expect(verifyBackendIdentity()).rejects.toMatchObject({ retryable: true });
  });

  it("outside vitest the identity request never goes through fetch, so it cannot turn an ISR render dynamic", async () => {
    // Without VITEST the module uses its node:http transport. Point it at a closed loopback port: the request must
    // fail as a retryable "unreachable" error WITHOUT ever touching (Next's patched) fetch.
    vi.stubEnv("VITEST", "");
    vi.stubEnv("STAFF_API_URL", "http://127.0.0.1:9");
    const { verifyBackendIdentity } = await load();
    await expect(verifyBackendIdentity()).rejects.toMatchObject({ retryable: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("STORE_ID unset: skipped with a one-time warning outside production, never in production", async () => {
    vi.stubEnv("STORE_ID", "");
    const { verifyBackendIdentity } = await load();
    await expect(verifyBackendIdentity()).resolves.toBeNull();
    await expect(verifyBackendIdentity()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);

    vi.stubEnv("NODE_ENV", "production");
    await expect(verifyBackendIdentity()).rejects.toMatchObject({ retryable: false, message: expect.stringContaining("STORE_ID is not set") });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a malformed STORE_ID is refused without asking the backend", async () => {
    vi.stubEnv("STORE_ID", "Store A");
    const { verifyBackendIdentity } = await load();
    await expect(verifyBackendIdentity()).rejects.toMatchObject({ retryable: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("announceBackendIdentity (production boot)", () => {
  it("logs the verified store, never throws, and warns (not errors) when the backend is merely unreachable", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { announceBackendIdentity } = await load();

    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(announceBackendIdentity()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(json({ storeId: "store-a" }));
    await announceBackendIdentity();
    expect(logSpy).toHaveBeenCalledWith("[identity] verified store 'store-a'");
  });

  it("a mismatch is a loud console.error and still does not throw", async () => {
    fetchMock.mockResolvedValue(json({ storeId: "store-b" }));
    const { announceBackendIdentity } = await load();
    await expect(announceBackendIdentity()).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("configured as store 'store-a' but STAFF_API_URL answers as store 'store-b'"));
  });
});
