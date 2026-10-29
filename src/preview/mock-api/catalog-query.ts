import { categories, collections, products } from "../fixtures/catalog";
import { priceRange } from "../lib/variant-selection";
import type { Locale, LocalizedString, Product } from "../types";

/*
 * STANDS IN FOR GET /api/storefront/products and /facets. In production the
 * server filters on variant attributes, returns DISTINCT products, sorts by
 * the derived price range and pages by seek cursor (MDS §6.2). The preview
 * has no backend, so the same semantics run here over the fixtures.
 */

export type SortKey = "relevance" | "priceAsc" | "priceDesc" | "newest";

export interface CatalogQuery {
  q?: string;
  category?: string;
  collection?: string;
  size?: string[];
  colour?: string[];
  price?: string; // band key
  sort?: SortKey;
}

export const PRICE_BANDS: Array<{ key: string; label: LocalizedString; min?: number; max?: number }> = [
  { key: "under-1000", label: { en: "Under EGP 1,000", ar: "أقل من ١٬٠٠٠ ج.م" }, max: 1000 },
  { key: "1000-2000", label: { en: "EGP 1,000–2,000", ar: "١٬٠٠٠–٢٬٠٠٠ ج.م" }, min: 1000, max: 2000 },
  { key: "over-2000", label: { en: "Over EGP 2,000", ar: "أكثر من ٢٬٠٠٠ ج.م" }, min: 2000 },
];

/**
 * Existential across axes (MDS §10): a product matches when ONE variant
 * carries a chosen size AND a chosen colour — "it comes in XXL" and "it comes
 * in Ink" does not mean "it comes in XXL in Ink". An empty choice matches any.
 */
const hasVariantMatching = (product: Product, size: string[], colour: string[]) =>
  (size.length === 0 && colour.length === 0) ||
  product.variants.some((variant) => {
    const value = (axis: string) => variant.optionValues.find((option) => option.key === axis)?.value;
    return (size.length === 0 || size.includes(value("size") ?? "")) && (colour.length === 0 || colour.includes(value("colour") ?? ""));
  });

/** Distinct products matching every applied filter — filtering is on variant attributes, the result is products. */
export function runQuery(query: CatalogQuery, locale: Locale): Product[] {
  const q = query.q?.trim().toLowerCase();
  const band = PRICE_BANDS.find((candidate) => candidate.key === query.price);
  const matched = products.filter((product) => {
    if (q && !`${product.name.en} ${product.name.ar} ${product.description[locale]}`.toLowerCase().includes(q)) return false;
    if (query.category && product.categorySlug !== query.category) return false;
    if (query.collection && !product.collectionSlugs.includes(query.collection)) return false;
    if (!hasVariantMatching(product, query.size ?? [], query.colour ?? [])) return false;
    if (band) {
      const min = Number(priceRange(product.variants).min);
      if ((band.min !== undefined && min < band.min) || (band.max !== undefined && min >= band.max)) return false;
    }
    return true;
  });
  const byMin = (product: Product) => Number(priceRange(product.variants).min);
  switch (query.sort) {
    case "priceAsc":
      return [...matched].sort((a, b) => byMin(a) - byMin(b));
    case "priceDesc":
      return [...matched].sort((a, b) => byMin(b) - byMin(a));
    case "newest":
      return [...matched].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    default:
      return matched;
  }
}

/** Facet values with counts against the query minus that facet's own filter — so a choice never reports 0 for itself. */
export function facets(query: CatalogQuery, locale: Locale) {
  const count = (patch: Partial<CatalogQuery>) => runQuery({ ...query, ...patch }, locale).length;
  return {
    categories: categories.map((category) => ({ value: category.slug, label: category.name, count: count({ category: category.slug }) })).filter((facet) => facet.count > 0 || facet.value === query.category),
    sizes: ["S", "M", "L", "XL", "XXL"].map((size) => ({ value: size, label: { en: size, ar: size }, count: count({ size: [size] }) })),
    colours: [
      { value: "olive", label: { en: "Olive", ar: "زيتوني" }, swatch: "#5f6b4a" },
      { value: "sand", label: { en: "Sand", ar: "رملي" }, swatch: "#d8c7a6" },
      { value: "ink", label: { en: "Ink", ar: "كحلي داكن" }, swatch: "#22262e" },
    ].map((colour) => ({ ...colour, count: count({ colour: [colour.value] }) })),
    prices: PRICE_BANDS.map((band) => ({ value: band.key, label: band.label, count: count({ price: band.key }) })),
    collectionName: collections.find((collection) => collection.slug === query.collection)?.name,
    categoryName: categories.find((category) => category.slug === query.category)?.name,
  };
}
