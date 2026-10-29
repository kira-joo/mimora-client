import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/config/site-origin";
import { resolveStoreLocales } from "@/i18n/store-locales";
import { getBrands, getCategories, getCollections, getContent, getStoreProfile, listAllProducts, orNull } from "@/lib/catalog/reads";
import { contentPageSlugs, sitemapEntries, sitemapPaths } from "@/lib/catalog/sitemap";

// = CATALOG_REVALIDATE_SECONDS; segment config must be a literal.
export const revalidate = 300;

/**
 * Generated from the catalog (MDS §21): every indexable route, in both locales,
 * with hreflang alternates — EVERY product (the walk pages through the whole
 * catalogue), the brand pages, and the content pages the store actually links
 * (read from its own content, so an unpublished page is never listed). Filtered
 * listings are deliberately absent — they are `noindex`. The origin is this
 * deployment's own (SITE_URL), never a constant. D-15: a read that fails leaves
 * that part out, logged — the build never fails for lack of data.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const [profile, categories, collections, brands, products, content] = await Promise.all([
    orNull(getStoreProfile, "profile"),
    orNull(getCategories, "categories"),
    orNull(getCollections, "collections"),
    orNull(getBrands, "brands"),
    orNull(listAllProducts, "all products (sitemap)"),
    orNull(getContent, "storefront content (sitemap)"),
  ]);
  if (!profile || !origin) return [];
  const paths = sitemapPaths({
    categorySlugs: (categories ?? []).map((category) => category.slug),
    collectionSlugs: (collections ?? []).map((collection) => collection.slug),
    brandSlugs: (brands ?? []).map((brand) => brand.slug),
    productSlugs: (products ?? []).map((product) => product.slug),
    contentPageSlugs: contentPageSlugs(content),
  });
  const served = resolveStoreLocales(profile);
  return sitemapEntries(paths, { origin, locales: served.supported, defaultLocale: served.defaultLocale });
}
