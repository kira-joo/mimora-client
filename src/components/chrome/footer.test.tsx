import { render, screen, within } from "@testing-library/react";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import enMessages from "@/i18n/locales/en/common.json";
import type { Category, ResolvedLink, StoreProfile } from "@/lib/api/types";
import { StoreProvider } from "@/components/providers/store-context";

vi.mock("next-intl/server", () => ({
  getLocale: async () => "en",
  getTranslations: async (namespace: string) => createTranslator({ locale: "en", messages: { common: enMessages }, namespace: namespace as "common" }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/theme/brand-assets", () => ({ wordmark: { src: "/wordmark.png", width: 2045, height: 769 } }));

import { Footer } from "./footer";

const label = { ar: "", en: "" };
const page = (slug: string, en: string): ResolvedLink => ({ kind: "page", slug, label: { ar: en, en } });
const categories: Category[] = [{ _id: "1", slug: "gift-boxes", sortOrder: 0, name: { ar: "", en: "Gift Boxes" } }];
const profile = (overrides: Partial<StoreProfile> = {}) =>
  ({ name: { ar: "ميمورا", en: "mimora" }, tagline: { ar: "", en: "Little things." }, description: { ar: "", en: "Thoughtful gifts." }, contact: null, socialLinks: [], supportedLocales: ["ar", "en"], defaultLocale: "ar", currency: "EGP", ...overrides }) as unknown as StoreProfile;

async function renderFooter(props: { profile?: StoreProfile; legalLinks?: ResolvedLink[]; footerNavigation?: ResolvedLink[] } = {}) {
  const ui = await Footer({ profile: props.profile ?? profile(), footerNavigation: props.footerNavigation ?? [], legalLinks: props.legalLinks ?? [], categories, hours: null });
  return render(
    <NextIntlClientProvider locale="en" messages={{ common: enMessages }}>
      <StoreProvider value={{ currency: "EGP", timeZone: "Africa/Cairo", storeName: { ar: "", en: "" }, allowVisitorGround: false, supportedLocales: ["ar", "en"] }}>{ui}</StoreProvider>
    </NextIntlClientProvider>,
  );
}

const linksIn = (name: string) => within(screen.getByRole("navigation", { name })).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")]);

describe("Footer", () => {
  it("links only what exists: the catalogue, and the pages the backend reports as published", async () => {
    await renderFooter({ legalLinks: [page("terms", "Terms of Sale"), page("shipping", "Delivery"), page("contact", "Contact")], footerNavigation: [page("faq", "FAQs"), page("about", "About Mimora"), { kind: "collection", slug: "offers", label }] });
    expect(linksIn("Explore")).toEqual([["Shop all", "/products"], ["Gift Boxes", "/categories/gift-boxes"], ["", "/collections/offers"]]);
    expect(linksIn("Customer care")).toEqual([["Contact", "/pages/contact"], ["FAQs", "/pages/faq"], ["Delivery", "/pages/shipping"]]);
    expect(linksIn("Information")).toEqual([["About Mimora", "/pages/about"], ["Terms of Sale", "/pages/terms"]]);
  });

  it("with nothing published, shows only Explore — no empty groups, no cookie link", async () => {
    await renderFooter({ legalLinks: [page("cookies", "Cookies & Storage")] });
    expect(screen.queryByRole("navigation", { name: "Customer care" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Information" })).toBeNull();
    expect(screen.queryByRole("link", { name: /Cookies/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cookie settings" })).toBeNull();
  });

  it("shows each configured social profile and the WhatsApp chat as a named, safe external link — and nothing unconfigured", async () => {
    await renderFooter({ profile: profile({ socialLinks: [{ platform: "Instagram", url: "https://instagram.com/mimora" }, { platform: "TikTok", url: "https://tiktok.com/@mimora" }], contact: { whatsApp: "+20 100 000 0000" } }) });
    const instagram = screen.getByRole("link", { name: "Instagram (opens in a new tab)" });
    expect(instagram.getAttribute("href")).toBe("https://instagram.com/mimora");
    expect(instagram.getAttribute("target")).toBe("_blank");
    expect(instagram.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByRole("link", { name: "WhatsApp (opens in a new tab)" }).getAttribute("href")).toBe("https://wa.me/201000000000");
    expect(screen.getByRole("link", { name: "TikTok (opens in a new tab)" }).querySelector("svg")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Facebook/ })).toBeNull();
  });

  it("has no social row and no contact block when the profile configures none", async () => {
    await renderFooter();
    expect(screen.queryByRole("heading", { name: "Follow us" })).toBeNull();
    expect(screen.queryByRole("link", { name: /opens in a new tab/ })).toBeNull();
  });

  it("closes with the copyright line and offers no language switch (that lives in the header)", async () => {
    await renderFooter();
    expect(screen.getByText(`© ${new Date().getFullYear()} Mimora. All rights reserved.`)).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Language" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Stay in the loop" })).toBeNull();
  });
});
