import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, type Locale } from "@/i18n/routing";
import { ListingView } from "@/components/listing/listing-view";
import { loadListing } from "@/lib/catalog/listing-page";
import { isFiltered, parseListing } from "@/lib/catalog/listing-query";
import { localized } from "@/lib/format/numerals";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * The catalog (MDS §6.2): filter, sort, paginate. Filter state lives in the URL,
 * so this route is dynamic; its reads still ride the tagged Data Cache per
 * query. Filtered and paginated views are `noindex` (MDS §21) — one canonical,
 * unfiltered listing, and category pages own their own URLs.
 */
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "common" });
  const state = parseListing(await searchParams);
  return { title: t("shopAll"), robots: isFiltered(state) || state.category || state.collection ? { index: false, follow: true } : undefined, alternates: { canonical: `/${locale}/products` } };
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  setRequestLocale(locale);
  const t = await getTranslations("common");
  const state = parseListing(await searchParams);
  const listing = await loadListing(state, locale, "/products", { search: t("search"), brand: t("brand"), priceFrom: t("priceFrom"), priceTo: t("priceTo") });
  if (!listing) notFound();

  const title = listing.collection ? localized(listing.collection.name, locale) : listing.category ? localized(listing.category.name, locale) : listing.brand ? localized(listing.brand.name, locale) : t("shopAll");
  return (
    <ListingView
      locale={locale}
      title={title}
      basePath="/products"
      state={state}
      products={listing.products}
      total={listing.page.total}
      totalPages={listing.page.totalPages}
      facets={listing.facets}
      categories={listing.lookups.categories}
      brands={listing.lookups.brands}
      currency={listing.currency}
      chips={listing.chips}
    />
  );
}
