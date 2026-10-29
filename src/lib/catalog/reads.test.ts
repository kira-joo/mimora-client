import { describe, expect, it, vi } from "vitest";

const request = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("../api/storefront-client", () => ({ storefrontApi: () => ({ request }) }));

/*
 * The 404 contract every detail page relies on: the shape `createApiClient`
 * actually throws must read as "not found" (null), and anything else must
 * still throw. The toolkit's own `nullableOnNotFound` failed the first half.
 */
describe("catalog detail reads", () => {
  it("turn the client's 404 into null", async () => {
    const { getPage } = await import("./reads");
    request.mockRejectedValueOnce({ statusCode: 404, message: 'Page "x" was not found.', error: "NOT_FOUND", raw: {} });
    await expect(getPage("x")).resolves.toBeNull();
  });

  it("rethrow anything that is not a 404 — an outage is not an absent page", async () => {
    const { getPage } = await import("./reads");
    request.mockRejectedValueOnce({ statusCode: 503, message: "unavailable" });
    await expect(getPage("y")).rejects.toMatchObject({ statusCode: 503 });
  });
});
