import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, type Locale } from "@/i18n/routing";
import { ListingView } from "@/components/listing/listing-view";
import { SearchEmpty } from "@/components/listing/search-empty";
import { loadListing } from "@/lib/catalog/listing-page";
import { parseListing } from "@/lib/catalog/listing-query";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "common" });
  return { title: t("search"), robots: { index: false, follow: true } };
}

/** Search results (MDS §6.4): localized product content; a genuine empty state with suggestions, never a blank grid. */
export default async function SearchPage({ params, searchParams }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  setRequestLocale(locale);
  const t = await getTranslations("common");
  const state = parseListing(await searchParams);
  if (!state.q) return <SearchEmpty />;
  const listing = await loadListing(state, locale, "/search", { search: t("search"), brand: t("brand"), priceFrom: t("priceFrom"), priceTo: t("priceTo") });
  if (!listing) notFound();
  if (listing.page.total === 0 && listing.chips.length <= 1) return <SearchEmpty query={state.q} />;
  return (
    <ListingView
      locale={locale}
      title={t("searchResultsFor", { q: state.q })}
      basePath="/search"
      state={state}
      products={listing.products}
      total={listing.page.total}
      totalPages={listing.page.totalPages}
      facets={listing.facets}
      categoryFacets={listing.categoryFacets}
      categories={listing.lookups.categories}
      brands={listing.lookups.brands}
      currency={listing.currency}
      chips={listing.chips.filter((chip) => chip.key !== "q")}
    />
  );
}
