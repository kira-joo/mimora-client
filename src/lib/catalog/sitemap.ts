import type { MetadataRoute } from "next";
import type { ResolvedLink, StorefrontContent } from "@/lib/api/types";

/*
 * The sitemap's contents, as pure functions: which paths exist, then how each
 * is written. Every path here is one the storefront actually serves — the
 * catalogue from the backend, the content pages from the store's own content
 * (published, resolved — an unpublished page is never a link there). Nothing
 * is a hardcoded list of "pages that probably exist".
 */
export interface SitemapSources {
  categorySlugs: string[];
  collectionSlugs: string[];
  brandSlugs: string[];
  productSlugs: string[];
  contentPageSlugs: string[];
}

/**
 * The slugs of every content page the store links to — legal links plus any
 * page the header or footer navigation carries — read from the store content,
 * so only a page that exists and is published can appear. Unique, in first-seen order.
 */
export function contentPageSlugs(content: Pick<StorefrontContent, "legalLinks" | "headerNavigation" | "footerNavigation"> | null | undefined): string[] {
  if (!content) return [];
  const links: ResolvedLink[] = [...content.legalLinks, ...content.headerNavigation, ...content.footerNavigation];
  return [...new Set(links.filter((link) => link.kind === "page" && link.slug).map((link) => link.slug))];
}

/** Locale-less paths, in a stable order: home, the catalogue, scopes, products, then content pages. */
export function sitemapPaths(sources: SitemapSources): string[] {
  return [
    "",
    "/products",
    ...sources.categorySlugs.map((slug) => `/categories/${slug}`),
    ...sources.collectionSlugs.map((slug) => `/collections/${slug}`),
    ...sources.brandSlugs.map((slug) => `/brands/${slug}`),
    ...sources.productSlugs.map((slug) => `/products/${slug}`),
    ...sources.contentPageSlugs.map((slug) => `/pages/${slug}`),
  ];
}

/** One entry per path (at the default locale) carrying an hreflang alternate for every locale. */
export function sitemapEntries(paths: string[], options: { origin: string; locales: readonly string[]; defaultLocale: string }): MetadataRoute.Sitemap {
  const { origin, locales, defaultLocale } = options;
  return paths.map((path) => ({
    url: `${origin}/${defaultLocale}${path}`,
    alternates: { languages: Object.fromEntries(locales.map((locale) => [locale, `${origin}/${locale}${path}`])) },
  }));
}
