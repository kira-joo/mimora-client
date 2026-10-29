import type { StorefrontContent } from "../types";
import { categories, collections } from "./catalog";

/*
 * DESIGN PREVIEW FIXTURE in the exact shape of `StorefrontContentView`
 * (GET /api/storefront/content) — what a merchant would publish from the
 * console's Storefront content screen: one announcement, header and footer
 * navigation, the always-present legal links, and the six section types.
 */

const L = (en: string, ar: string) => ({ en, ar });
const category = (slug: string) => {
  const found = categories.find((c) => c.slug === slug)!;
  return { slug: found.slug, name: found.name, ...(found.image ? { image: found.image } : {}) };
};
const collection = (slug: string) => {
  const found = collections.find((c) => c.slug === slug)!;
  return { slug: found.slug, name: found.name, description: found.description, ...(found.image ? { image: found.image } : {}) };
};

export const content: StorefrontContent = {
  announcement: {
    message: L("New: The workbench — hand tools made to be handed down", "جديد: طاولة العمل — عُدد يدوية تُصنع لتُورَّث"),
    link: { kind: "collection", slug: "the-workbench", label: L("The workbench", "طاولة العمل") },
  },
  headerNavigation: [
    { kind: "category", slug: "shirts", label: L("Shirts", "قمصان") },
    { kind: "category", slug: "workwear", label: L("Workwear", "ملابس العمل") },
    { kind: "category", slug: "hand-tools", label: L("Hand tools", "عُدد يدوية") },
    { kind: "category", slug: "workshop", label: L("Workshop", "مستلزمات الورشة") },
    { kind: "collection", slug: "washed-linen", label: L("Washed linen", "الكتان المغسول") },
    { kind: "collection", slug: "the-workbench", label: L("The workbench", "طاولة العمل") },
  ],
  footerNavigation: [
    { kind: "page", slug: "about", label: L("Our workshop", "عن ورشتنا") },
    { kind: "page", slug: "care", label: L("Caring for linen and steel", "العناية بالكتان والصلب") },
    { kind: "collection", slug: "autumn-work", label: L("Autumn work clothes", "ملابس العمل للخريف") },
  ],
  legalLinks: [
    { kind: "page", slug: "terms", label: L("Terms of Sale", "شروط البيع") },
    { kind: "page", slug: "privacy", label: L("Privacy Policy", "سياسة الخصوصية") },
    { kind: "page", slug: "returns", label: L("Returns & Refunds", "الإرجاع والاسترداد") },
    { kind: "page", slug: "shipping", label: L("Delivery & Collection", "التوصيل والاستلام") },
    { kind: "page", slug: "contact", label: L("Contact", "اتصل بنا") },
  ],
  homeSections: [
    {
      type: "campaignHero",
      headline: L("Made to be used for years", "أشياء تُصنع لتُستخدم سنوات"),
      subline: L("Washed linen for the heat, forged steel for the bench.", "كتان مغسول لأيام الحر، وصلب مطروق لطاولة العمل."),
      action: { label: L("Explore the workbench", "اكتشف طاولة العمل"), link: { kind: "collection", slug: "the-workbench", label: L("The workbench", "طاولة العمل") } },
      image: { src: "/preview/images/hero-workshop.jpg", alt: L("A workbench with hand tools in morning light", "طاولة عمل وعُدد يدوية في ضوء الصباح") },
    },
    { type: "categoryTiles", heading: L("Shop by category", "تسوق حسب الفئة"), categories: ["shirts", "hand-tools", "workwear", "accessories"].map(category) },
    { type: "collectionStory", collection: collection("washed-linen"), heading: L("Washed linen", "الكتان المغسول") },
    { type: "productRail", source: "collection", collection: { slug: "the-workbench", name: L("The workbench", "طاولة العمل") }, heading: L("From the workbench", "من طاولة العمل") },
    { type: "editorialBand", headline: L("Every edge honed by hand before it leaves the workshop", "كل حدّ يُشحذ باليد قبل أن يغادر الورشة"), collection: collection("the-workbench") },
    { type: "productRail", source: "newest" },
    { type: "assuranceStrip" },
  ],
};
