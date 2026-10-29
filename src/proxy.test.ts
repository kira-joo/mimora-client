// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoreLocales } from "./i18n/store-locales";

let locales: StoreLocales = { supported: ["ar", "en"], defaultLocale: "ar" };
vi.mock("./lib/config/store-locales-source", () => ({ getStoreLocales: async () => locales }));

const { default: proxy } = await import("./proxy");

const run = (path: string, cookies = "") => proxy(new NextRequest(`http://shop.test${path}`, { headers: cookies ? { cookie: cookies } : {} }));
const location = (response: Response) => response.headers.get("location");

beforeEach(() => {
  locales = { supported: ["ar", "en"], defaultLocale: "ar" };
});

describe("proxy — store locales (plan #76)", () => {
  it("redirects / to the profile's default locale", async () => {
    locales = { supported: ["en"], defaultLocale: "en" };
    const response = await run("/");
    expect(response.status).toBe(307);
    expect(location(response)).toBe("http://shop.test/en");
  });

  it("redirects / to Arabic when Arabic is the default", async () => {
    expect(location(await run("/"))).toBe("http://shop.test/ar");
  });

  it("redirects an unsupported locale to the same path under the default, keeping the query", async () => {
    locales = { supported: ["ar"], defaultLocale: "ar" };
    const response = await run("/en/products/red-shirt?attr=material:cotton&page=2");
    expect(response.status).toBe(307);
    expect(location(response)).toBe("http://shop.test/ar/products/red-shirt?attr=material:cotton&page=2");
  });

  it("prefixes an unprefixed path with the store's default, not the codebase's", async () => {
    locales = { supported: ["en"], defaultLocale: "en" };
    expect(location(await run("/products"))).toBe("http://shop.test/en/products");
  });

  it("lets a supported locale through — no redirect", async () => {
    const response = await run("/en/products");
    expect(response.status).toBe(200);
    expect(location(response)).toBeNull();
  });

  it("hreflang Link headers name only the locales the store serves", async () => {
    locales = { supported: ["ar"], defaultLocale: "ar" };
    const link = (await run("/ar/products")).headers.get("link") ?? "";
    expect(link).not.toContain('hreflang="en"');

    locales = { supported: ["ar", "en"], defaultLocale: "ar" };
    const both = (await run("/ar/products")).headers.get("link") ?? "";
    expect(both).toContain('hreflang="en"');
    expect(both).toContain('hreflang="ar"');
  });

  it("the account guard still redirects a signed-out visitor, under the store's default locale for an unsupported one", async () => {
    const response = await run("/ar/account/orders");
    expect(response.status).toBe(307);
    expect(location(response)).toContain("/ar/login?redirectTo=");

    locales = { supported: ["ar"], defaultLocale: "ar" };
    expect(location(await run("/en/account"))).toBe("http://shop.test/ar/account"); // locale first, then the guard on the next hop
  });

  it("a signed-in marker is let through the guard", async () => {
    const response = await run("/ar/account/orders", "sf_marker=1");
    expect(response.status).toBe(200);
  });
});
