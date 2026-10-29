import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./cookies", () => ({
  readSessionCookies: async () => ({ session: "sess-token", refresh: undefined, marker: "1", cart: "cart-token" }),
  writeSession: vi.fn(),
  clearSession: vi.fn(),
  writeCartToken: vi.fn(),
  clearCartToken: vi.fn(),
}));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const isIdentity = (url: unknown) => String(url).endsWith("/api/storefront/identity");

let identity: () => Promise<Response>;
let fetchMock: ReturnType<typeof vi.fn>;
const shopCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/shop/"));
const identityCalls = () => fetchMock.mock.calls.filter(([url]) => isIdentity(url));

const request = () => new Request("http://shop.test/api/session/cart", { headers: { "x-store-locale": "en" } });

beforeEach(() => {
  vi.resetModules();
  identity = async () => json({ storeId: "store-a" });
  fetchMock = vi.fn(async (url: unknown) => (isIdentity(url) ? identity() : json({ lines: [] })));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("STAFF_API_URL", "http://backend.test");
  vi.stubEnv("STORE_ID", "store-a");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("shopRequest behind the identity check", () => {
  it("match: forwards the request (with the customer's cookies) and verifies only once across calls", async () => {
    const { shopRequest } = await import("./shop-request");
    const { ShopEndpoints } = await import("../api/shop.endpoints");

    for (let i = 0; i < 3; i++) await expect(shopRequest(request(), ShopEndpoints.cart)).resolves.toMatchObject({ status: 200, data: { lines: [] } });

    expect(identityCalls()).toHaveLength(1);
    expect(shopCalls()).toHaveLength(3);
    expect(shopCalls()[0]![0]).toBe("http://backend.test/api/shop/cart");
    expect(shopCalls()[0]![1].headers.Cookie).toContain("sess-token");
  });

  it("mismatch: answers 503 and the backend never receives the request, its cookies or the cart token", async () => {
    identity = async () => json({ storeId: "store-b" });
    const { shopRequest } = await import("./shop-request");
    const { ShopEndpoints } = await import("../api/shop.endpoints");

    const result = await shopRequest(request(), ShopEndpoints.cart);
    expect(result.status).toBe(503);
    expect(JSON.stringify(result.data)).not.toContain("store-b");
    expect(shopCalls()).toHaveLength(0);
    expect(fetchMock.mock.calls.every(([url]) => isIdentity(url))).toBe(true);
  });

  it("unreachable: 503, nothing forwarded; a later success is forwarded (failure not memoised)", async () => {
    identity = async () => {
      throw new TypeError("fetch failed");
    };
    const { shopRequest } = await import("./shop-request");
    const { ShopEndpoints } = await import("../api/shop.endpoints");

    await expect(shopRequest(request(), ShopEndpoints.cart)).resolves.toMatchObject({ status: 503 });
    expect(shopCalls()).toHaveLength(0);

    identity = async () => json({ storeId: "store-a" });
    await expect(shopRequest(request(), ShopEndpoints.cart)).resolves.toMatchObject({ status: 200 });
    expect(shopCalls()).toHaveLength(1);
  });
});
