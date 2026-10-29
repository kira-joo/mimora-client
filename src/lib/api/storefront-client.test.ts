import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const isIdentity = (url: unknown) => String(url).endsWith("/api/storefront/identity");

let identity: () => Promise<Response>;
let fetchMock: ReturnType<typeof vi.fn>;
const catalogCalls = () => fetchMock.mock.calls.filter(([url]) => !isIdentity(url));
const identityCalls = () => fetchMock.mock.calls.filter(([url]) => isIdentity(url));

beforeEach(() => {
  vi.resetModules();
  identity = async () => json({ storeId: "store-a" });
  fetchMock = vi.fn(async (url: unknown) => (isIdentity(url) ? identity() : json([{ id: "c1" }])));
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

describe("storefront client behind the identity check", () => {
  it("match: the catalog read is made once, with its own cache config intact, and the identity is asked once", async () => {
    const { storefrontApi } = await import("./storefront-client");
    const { StorefrontEndpoints } = await import("./storefront.endpoints");
    const transport = { next: { tags: ["categories"], revalidate: 300 } };

    for (let i = 0; i < 5; i++) await expect(storefrontApi().request(StorefrontEndpoints.categories, { transport })).resolves.toEqual([{ id: "c1" }]);

    expect(identityCalls()).toHaveLength(1);
    expect(catalogCalls()).toHaveLength(5);
    expect(catalogCalls()[0]![0]).toBe("http://backend.test/api/storefront/categories");
    expect(catalogCalls()[0]![1]).toMatchObject({ next: { tags: ["categories"], revalidate: 300 } });
    expect(identityCalls()[0]![1]).toMatchObject({ cache: "no-store" });
  });

  it("mismatch: the read throws and NOTHING is requested from the catalog", async () => {
    identity = async () => json({ storeId: "store-b" });
    const { storefrontApi } = await import("./storefront-client");
    const { StorefrontEndpoints } = await import("./storefront.endpoints");

    await expect(storefrontApi().request(StorefrontEndpoints.categories)).rejects.toMatchObject({ message: expect.stringContaining("answers as store 'store-b'") });
    expect(catalogCalls()).toHaveLength(0);
  });

  it("unreachable: the read fails without a status (so it is never mistaken for a 404) and recovers when the backend answers", async () => {
    identity = async () => {
      throw new TypeError("fetch failed");
    };
    const { storefrontApi } = await import("./storefront-client");
    const { StorefrontEndpoints } = await import("./storefront.endpoints");

    const failure = await storefrontApi().request(StorefrontEndpoints.categories).catch((error: unknown) => error);
    expect(failure).toMatchObject({ message: expect.stringContaining("could not be reached") });
    expect((failure as { statusCode?: number }).statusCode).toBeUndefined();
    expect(catalogCalls()).toHaveLength(0);

    identity = async () => json({ storeId: "store-a" });
    await expect(storefrontApi().request(StorefrontEndpoints.categories)).resolves.toEqual([{ id: "c1" }]);
    expect(catalogCalls()).toHaveLength(1);
  });

  it("an identity 404 is not read as 'not found' by the catalog's null-on-404 reads", async () => {
    identity = async () => json({ message: "Not Found" }, 404);
    const { getPage } = await import("../catalog/reads");
    await expect(getPage("about")).rejects.toBeDefined();
    expect(catalogCalls()).toHaveLength(0);
  });
});

describe("orNull catalog reads (D-15) on an identity failure", () => {
  it.each([
    ["mismatch", async () => json({ storeId: "store-b" })],
    ["unreachable", async () => { throw new TypeError("fetch failed"); }],
    ["non-2xx", async () => json({}, 503)],
  ])("%s: degrades to the absent state, logs, and requests no catalog data", async (_label, answer) => {
    identity = answer as () => Promise<Response>;
    const { orNull, getCategories, listAllProducts } = await import("../catalog/reads");

    await expect(orNull(() => getCategories(), "categories")).resolves.toBeNull();
    await expect(orNull(() => listAllProducts(), "sitemap products")).resolves.toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("[catalog] categories failed"));
    expect(catalogCalls()).toHaveLength(0);
  });
});
