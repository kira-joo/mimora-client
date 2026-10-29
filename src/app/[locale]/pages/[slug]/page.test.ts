import { beforeEach, describe, expect, it, vi } from "vitest";

// `reads` is server-only (it must never reach a client bundle); the marker module refuses jsdom, so stub only it.
vi.mock("server-only", () => ({}));

const getContent = vi.fn();
vi.mock("@/lib/catalog/reads", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/catalog/reads")>();
  return { ...actual, getContent: () => getContent(), getPage: vi.fn() };
});

const { generateStaticParams } = await import("./page");

describe("content page generateStaticParams (D-15)", () => {
  beforeEach(() => {
    getContent.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("prebuilds nothing when the backend is unreachable, so the build cannot fail on a page body read", async () => {
    getContent.mockRejectedValue(Object.assign(new Error("fetch failed"), { statusCode: undefined }));
    await expect(generateStaticParams()).resolves.toEqual([]);
  });

  it("prebuilds the legal pages plus every linked page, in both locales, when content loads", async () => {
    getContent.mockResolvedValue({
      headerNavigation: [{ kind: "page", slug: "about" }],
      footerNavigation: [{ kind: "category", slug: "tools" }, { kind: "page", slug: "terms" }],
      legalLinks: [],
    });
    const params = await generateStaticParams();
    expect(params).toContainEqual({ locale: "ar", slug: "terms" });
    expect(params).toContainEqual({ locale: "en", slug: "about" });
    expect(params).not.toContainEqual(expect.objectContaining({ slug: "tools" }));
    expect(params.filter((p) => p.slug === "terms")).toHaveLength(2); // deduplicated: legal and linked
  });
});
