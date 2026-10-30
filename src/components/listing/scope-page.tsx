import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, routing, type Locale } from "@/i18n/routing";
import { ListingView } from "@/components/listing/listing-view";
import { JsonLd } from "@/components/seo/json-ld";
import { categoryTrail, flatTrail } from "@/lib/catalog/breadcrumbs";
import { siteOrigin } from "@/lib/config/site-origin";
import { breadcrumbListJsonLd } from "@/lib/seo/structured-data";
import { getBrands, getCategories, getCollections, orNull } from "@/lib/catalog/reads";
import { loadListing } from "@/lib/catalog/listing-page";
import { parseListing } from "@/lib/catalog/listing-query";
import { storeAlternates } from "@/lib/seo/alternates";
import { localized } from "@/lib/format/numerals";

/*
 * A category, collection or brand landing page (MDS §4, §5): ISR with
 * `generateStaticParams`, the first unfiltered page only — so it reads no
 * searchParams and stays static. Its filter and sort controls hand off to
 * `/products` with the scope preset, which is the dynamic, `noindex` surface.
 * A category owns the canonical product URLs; a collection does not compete.
 */
export type ScopeKind = "category" | "collection" | "brand";

async function scopes(kind: ScopeKind) {
  if (kind === "category") return (await orNull(getCategories, "categories")) ?? [];
  if (kind === "collection") return (await orNull(getCollections, "collections")) ?? [];
  return (await orNull(getBrands, "brands")) ?? [];
}

/** D-15: an unreachable backend yields no prebuilt pages (they render on first request), never a failed build. */
export async function scopeStaticParams(kind: ScopeKind) {
  const all = await scopes(kind);
  return routing.locales.flatMap((locale) => all.map((scope) => ({ locale, slug: scope.slug })));
}

export async function scopeMetadata(kind: ScopeKind, locale: string, slug: string): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const scope = (await scopes(kind)).find((candidate) => candidate.slug === slug);
  if (!scope) return {};
  const seo = scope as { seoTitle?: Parameters<typeof localized>[0]; seoDescription?: Parameters<typeof localized>[0]; description?: Parameters<typeof localized>[0] };
  const segment = kind === "category" ? "categories" : kind === "collection" ? "collections" : "brands";
  return {
    title: localized(seo.seoTitle, locale) || localized(scope.name, locale),
    description: localized(seo.seoDescription, locale) || localized(seo.description, locale) || undefined,
    alternates: { canonical: `/${locale}/${segment}/${slug}`, languages: await storeAlternates(`/${segment}/${slug}`) },
  };
}

export async function ScopePage({ kind, params }: { kind: ScopeKind; params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  setRequestLocale(locale);
  const t = await getTranslations("common");
  const state = parseListing({ [kind]: slug });
  const listing = await loadListing(state, locale, "/products", { search: t("search"), brand: t("brand"), priceFrom: t("priceFrom"), priceTo: t("priceTo") });
  const scope = kind === "category" ? listing?.category : kind === "collection" ? listing?.collection : listing?.brand;
  if (!listing || !scope) notFound();

  // Home › the category's real ancestor chain › the page (a collection or brand has no ancestors). One trail feeds the visible nav AND the BreadcrumbList.
  const segment = kind === "category" ? "categories" : kind === "collection" ? "collections" : "brands";
  const trail = kind === "category" && listing.category ? categoryTrail({ homeLabel: t("breadcrumbHome"), locale, categories: listing.lookups.categories, category: listing.category }) : flatTrail({ homeLabel: t("breadcrumbHome"), current: localized(scope.name, locale) });
  return (
    <>
      <JsonLd data={breadcrumbListJsonLd(trail, { origin: siteOrigin(), locale, currentPath: `/${segment}/${slug}` })} />
      <ListingView
        locale={locale}
        title={localized(scope.name, locale)}
        description={localized(scope.description, locale) || undefined}
        basePath="/products"
        state={state}
        products={listing.products}
        total={listing.page.total}
        totalPages={listing.page.totalPages}
        facets={listing.facets}
        categoryFacets={listing.categoryFacets}
        categories={listing.lookups.categories}
        brands={listing.lookups.brands}
        currency={listing.currency}
        chips={[]}
        trail={trail}
      />
    </>
  );
}
