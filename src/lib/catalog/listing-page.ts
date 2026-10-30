import "server-only";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getBrands, getCategories, getCollections, getFacets, getStoreProfile, listProducts, orNull } from "./reads";
import { toCardProduct } from "./card-model";
import { toApiQuery, toSearch, type ListingState } from "./listing-query";
import { loadPromotionBadges } from "./promotion-badges";
import { formatPrice, localized } from "@/lib/format/numerals";
import type { Chip } from "@/components/listing/listing-view";

/**
 * Everything a listing page needs, from the URL state: the scope lookups, the
 * page of products, facets for the scope, and the applied-filter chips with
 * the count each removal would show (so "remove the narrowest" is measured,
 * not guessed). `null` when the scope in the URL does not exist.
 */
export async function loadListing(state: ListingState, locale: Locale, basePath: string, labels: { search: string; brand: string; priceFrom: string; priceTo: string }) {
  const [categories, collections, brands, profile] = await Promise.all([orNull(getCategories, "categories"), orNull(getCollections, "collections"), orNull(getBrands, "brands"), orNull(getStoreProfile, "store profile")]);
  const lookups = { categories: categories ?? [], collections: collections ?? [], brands: brands ?? [] };
  const query = toApiQuery(state, lookups);
  if (!query) return null;

  const scope = { categoryId: query.categoryId, collectionId: query.collectionId, search: query.search };
  // The category rail lists every category in this search / collection, not only the chosen one: facets scoped to a category count nothing else.
  const railScope = { collectionId: query.collectionId, search: query.search };
  const [page, facets, categoryFacets] = await Promise.all([listProducts(query), orNull(() => getFacets(scope), "facets"), query.categoryId ? orNull(() => getFacets(railScope), "category facets") : Promise.resolve(null)]);
  const now = Date.now();
  const currency = profile?.currency ?? "XXX";
  const badges = await loadPromotionBadges(locale, currency);

  const chipDefs: Array<{ key: string; label: string; drop: Partial<ListingState> }> = [];
  if (state.q) chipDefs.push({ key: "q", label: `${labels.search}: ${state.q}`, drop: { q: undefined } });
  const category = lookups.categories.find((candidate) => candidate.slug === state.category);
  if (category) chipDefs.push({ key: "category", label: localized(category.name, locale), drop: { category: undefined } });
  const collection = lookups.collections.find((candidate) => candidate.slug === state.collection);
  if (collection) chipDefs.push({ key: "collection", label: localized(collection.name, locale), drop: { collection: undefined } });
  const brand = lookups.brands.find((candidate) => candidate.slug === state.brand);
  if (brand) chipDefs.push({ key: "brand", label: `${labels.brand}: ${localized(brand.name, locale)}`, drop: { brand: undefined } });
  for (const pair of state.attr) {
    const colon = pair.indexOf(":");
    const axis = facets?.attributes.find((candidate) => candidate.key === pair.slice(0, colon));
    const value = axis?.values.find((candidate) => candidate.key === pair.slice(colon + 1));
    chipDefs.push({ key: `attr-${pair}`, label: `${axis ? localized(axis.name, locale) : pair.slice(0, colon)}: ${value ? localized(value.label, locale) : pair.slice(colon + 1)}`, drop: { attr: state.attr.filter((candidate) => candidate !== pair) } });
  }
  // Size / colour: the merchant's own words from the facets, the raw value when the facet no longer lists it.
  for (const pair of state.opt) {
    const colon = pair.indexOf(":");
    const axis = facets?.options?.find((candidate) => candidate.key === pair.slice(0, colon));
    const value = axis?.values.find((candidate) => candidate.key === pair.slice(colon + 1));
    chipDefs.push({ key: `opt-${pair}`, label: `${axis ? localized(axis.name, locale) : pair.slice(0, colon)}: ${value ? localized(value.label, locale) : pair.slice(colon + 1)}`, drop: { opt: state.opt.filter((candidate) => candidate !== pair) } });
  }
  if (state.inStock) chipDefs.push({ key: "inStock", label: (await getTranslations({ locale, namespace: "common" }))("catalogExtras.inStockOnly"), drop: { inStock: false } });
  if (state.minPrice) chipDefs.push({ key: "min", label: `${labels.priceFrom} ${formatPrice(locale, state.minPrice, currency)}`, drop: { minPrice: undefined } });
  if (state.maxPrice) chipDefs.push({ key: "max", label: `${labels.priceTo} ${formatPrice(locale, state.maxPrice, currency)}`, drop: { maxPrice: undefined } });

  // Counts for each removal only when they matter: an empty result needs "remove the narrowest".
  const chips: Chip[] = await Promise.all(
    chipDefs.map(async (chip) => {
      const next = { ...state, ...chip.drop, page: 1 };
      let count: number | undefined;
      if (page.total === 0) {
        const nextQuery = toApiQuery(next, lookups, 1);
        count = nextQuery ? ((await orNull(() => listProducts(nextQuery), "chip count"))?.total ?? 0) : 0;
      }
      return { key: chip.key, label: chip.label, href: `${basePath}${toSearch(next)}`, count };
    })
  );

  return {
    lookups,
    currency,
    page,
    facets,
    /** Category counts for the rail — unscoped by the chosen category. */
    categoryFacets: (categoryFacets ?? facets)?.categories ?? [],
    chips,
    products: page.data.map((product) => toCardProduct(product, locale, lookups.categories, now, badges)),
    category,
    collection,
    brand,
  };
}
