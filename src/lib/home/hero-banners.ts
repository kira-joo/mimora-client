import type { StaticImageData } from "next/image";
import type { Locale } from "@/i18n/routing";
import { linkHref } from "@/lib/links";
import bannerBrandAr from "../../../public/images/hero/banner-1.png";
import bannerBrandEn from "../../../public/images/hero/banner-1-en.png";
import bannerBrandMobileAr from "../../../public/images/hero/banner-md-ar.png";
import bannerBrandMobileEn from "../../../public/images/hero/banner-md-en.png";
import bannerGifts from "../../../public/images/hero/banner-2.png";
import bannerOffers from "../../../public/images/hero/banner-3.png";

/**
 * The home hero's three campaigns — Mimora's own artwork (public/images/hero), shipped with this client's design.
 * Static imports, so a missing file fails the build and every banner carries its intrinsic size.
 *
 *  1. Brand banner: complete artwork with its own logo, headline and button drawn in — one image per language
 *     (banner-1.png for Arabic, banner-1-en.png for English), plus a portrait version of each for phones
 *     (banner-md-ar.png, banner-md-en.png). Nothing is laid over it; the whole banner is the link.
 *  2. Gift collection: photograph with live copy over its empty right-hand side → All Products.
 *  3. Offers: photograph with live copy over its empty left-hand side → the "offers" collection when the store has
 *     one (an existing route, /collections/{slug}), otherwise All Products. No offers page exists, and none is invented.
 *
 * The empty side is a property of the photograph, not of the reading direction, so `copySide` is physical.
 */
export type HeroBanner =
  | { id: "brand"; kind: "artwork"; image: StaticImageData; mobileImage: StaticImageData; href: string }
  | { id: "gifts" | "offers"; kind: "photo"; image: StaticImageData; href: string; copySide: "left" | "right" };

export const GIFT_BOXES_CATEGORY = "gift-boxes";
export const OFFERS_COLLECTION = "offers";

export function heroBanners(locale: Locale, collectionSlugs: readonly string[]): HeroBanner[] {
  const offersHref = collectionSlugs.includes(OFFERS_COLLECTION) ? linkHref({ kind: "collection", slug: OFFERS_COLLECTION }) : "/products";
  return [
    { id: "brand", kind: "artwork", image: locale === "ar" ? bannerBrandAr : bannerBrandEn, mobileImage: locale === "ar" ? bannerBrandMobileAr : bannerBrandMobileEn, href: linkHref({ kind: "category", slug: GIFT_BOXES_CATEGORY }) },
    { id: "gifts", kind: "photo", image: bannerGifts, href: "/products", copySide: "right" },
    { id: "offers", kind: "photo", image: bannerOffers, href: offersHref, copySide: "left" },
  ];
}
