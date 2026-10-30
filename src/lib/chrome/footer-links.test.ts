import { describe, expect, it } from "vitest";
import type { Category, ResolvedLink } from "@/lib/api/types";
import { exploreLinks, pageGroups, socialChannels, whatsAppChatUrl } from "./footer-links";

const category = (slug: string, sortOrder: number, parentId?: string): Category => ({ _id: slug, slug, sortOrder, parentId, name: { ar: slug, en: slug } });
const page = (slug: string): ResolvedLink => ({ kind: "page", slug, label: { ar: slug, en: slug } });

describe("exploreLinks", () => {
  it("lists top-level categories in the store's order, then the owner's non-page footer links, without repeats", () => {
    const links = exploreLinks(
      [category("pajamas", 2), category("gift-boxes", 0), category("mini-mugs", 1, "mugs"), category("mugs", 1)],
      [{ kind: "collection", slug: "offers", label: { ar: "", en: "" } }, { kind: "category", slug: "mugs", label: { ar: "", en: "" } }, page("about")],
    );
    expect(links.map((link) => link.href)).toEqual(["/categories/gift-boxes", "/categories/mugs", "/categories/pajamas", "/collections/offers"]);
  });
});

describe("pageGroups", () => {
  it("places published pages by slug and never lists a page that was not reported", () => {
    const { care, info } = pageGroups([page("terms"), page("privacy"), page("shipping"), page("contact")], [page("about"), page("faq"), page("size-guide")]);
    expect(care.map((link) => link.href)).toEqual(["/pages/contact", "/pages/faq", "/pages/shipping"]);
    expect(info.map((link) => link.href)).toEqual(["/pages/about", "/pages/privacy", "/pages/terms", "/pages/size-guide"]);
  });

  it("never lists the cookie page, even when it is published", () => {
    const { care, info } = pageGroups([page("cookies"), page("privacy")], [page("cookies")]);
    expect([...care, ...info].map((link) => link.href)).toEqual(["/pages/privacy"]);
  });

  it("is empty when nothing is published", () => {
    expect(pageGroups([], [])).toEqual({ care: [], info: [] });
  });
});

describe("socialChannels", () => {
  it("recognises the owner's free-text platform names and adds the WhatsApp chat from the business number", () => {
    const channels = socialChannels({
      socialLinks: [
        { platform: "Instagram", url: "https://instagram.com/shop" },
        { platform: "Tik Tok", url: "https://tiktok.com/@shop" },
        { platform: "Pinterest", url: "https://pinterest.com/shop" },
      ],
      contact: { whatsApp: "+20 100 000 0000" },
    });
    expect(channels).toEqual([
      { platform: "instagram", name: "Instagram", url: "https://instagram.com/shop" },
      { platform: "tiktok", name: "Tik Tok", url: "https://tiktok.com/@shop" },
      { platform: "other", name: "Pinterest", url: "https://pinterest.com/shop" },
      { platform: "whatsapp", name: "WhatsApp", url: "https://wa.me/201000000000" },
    ]);
  });

  it("never turns a non-web URL into a link, and shows nothing when nothing is configured", () => {
    expect(socialChannels({ socialLinks: [{ platform: "facebook", url: "javascript:alert(1)" }], contact: { whatsApp: "" } })).toEqual([]);
    expect(socialChannels({ socialLinks: [], contact: null as never })).toEqual([]);
  });

  it("keeps an explicit WhatsApp link rather than adding a second one", () => {
    const channels = socialChannels({ socialLinks: [{ platform: "WhatsApp", url: "https://wa.me/201111111111" }], contact: { whatsApp: "+201000000000" } });
    expect(channels).toHaveLength(1);
  });
});

describe("whatsAppChatUrl", () => {
  it("is a direct chat with the number's digits", () => {
    expect(whatsAppChatUrl("+20 (100) 000-0000")).toBe("https://wa.me/201000000000");
    expect(whatsAppChatUrl(undefined)).toBeNull();
  });
});
