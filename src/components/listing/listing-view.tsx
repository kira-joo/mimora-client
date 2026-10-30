import { X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import type { Crumb } from "@/lib/catalog/breadcrumbs";
import { ProductCard } from "@/components/product/product-card";
import { Bow } from "@/components/home/ornaments";
import { TitleWithHeart } from "@/components/home/section-head";
import type { Locale } from "@/i18n/routing";
import type { Brand, Category, CatalogFacets } from "@/lib/api/types";
import type { CardProduct } from "@/lib/catalog/card-model";
import type { FacetDef } from "@/lib/catalog/listing-facets";
import { toSearch, type ListingState } from "@/lib/catalog/listing-query";
import { formatNumber, localized } from "@/lib/format/numerals";
import { CategoryRail, type CategoryOption } from "./category-rail";
import { ListingAnalytics } from "./listing-analytics";
import { ListingControls } from "./listing-controls";

export interface Chip {
  key: string;
  label: string;
  /** The URL with this one filter removed. */
  href: string;
  /** How many products that URL shows — measured, so "remove the narrowest" is real. */
  count?: number;
}

interface ListingViewProps {
  locale: Locale;
  title: string;
  description?: string;
  /** Where filter/sort changes navigate: this page for /products and /search, `/products` from an ISR scope page. */
  basePath: string;
  state: ListingState;
  products: CardProduct[];
  total: number;
  totalPages: number;
  facets: CatalogFacets | null;
  /** Category counts for the rail, independent of the chosen category. Falls back to `facets`. */
  categoryFacets?: Array<{ key: string; count: number }>;
  categories: Category[];
  brands: Brand[];
  currency: string;
  chips: Chip[];
  /** Home › ancestors › this page — category, collection and brand pages. Absent on /products and /search. */
  trail?: Crumb[];
}

/**
 * Listing (MDS §6.2, design-system §13b): a gingham banner with the title and
 * the live count, the boutique's category rail, a filter bar (popovers on a
 * desktop, a sticky Filters / Sort pair and a sheet on a phone), the applied
 * filters as removable chips, and the product grid across the full width — no
 * sidebar. Empty results are a designed state: what was searched, what is
 * applied, and one tap to drop the narrowest filter (MDS §9). "Nothing here
 * yet" and "nothing matches" are different words.
 */
export async function ListingView(props: ListingViewProps) {
  const { locale, title, description, basePath, state, products, total, totalPages, facets, categoryFacets, categories, brands, currency, chips, trail } = props;
  const t = await getTranslations("common");
  const ui = await getTranslations("common.listingUi");
  const narrowest = chips.length ? chips.reduce((best, chip) => ((chip.count ?? 0) > (best.count ?? 0) ? chip : best)) : null;
  const filtered = chips.length > 0;
  // A stable name for what is shown: a search, a scope, or the whole catalog — for analytics only.
  const listId = state.q ? "search" : state.category ? `category:${state.category}` : state.collection ? `collection:${state.collection}` : state.brand ? `brand:${state.brand}` : "all";

  const categoryOptions: Array<CategoryOption & { sortOrder: number }> = (categoryFacets ?? facets?.categories ?? [])
    .map((facet) => {
      const category = categories.find((candidate) => candidate._id === facet.key);
      return category ? { slug: category.slug, label: localized(category.name, locale), count: facet.count, sortOrder: category.sortOrder } : null;
    })
    .filter((option): option is CategoryOption & { sortOrder: number } => option !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const brandValues = (facets?.brands ?? [])
    .map((facet) => {
      const brand = brands.find((candidate) => candidate._id === facet.key);
      return brand ? { key: brand.slug, label: localized(brand.name, locale), count: facet.count } : null;
    })
    .filter((option): option is NonNullable<typeof option> => option !== null);

  // Every choice facet as plain data for the client: category (sheet only), brand, size / colour in the merchant's own order, then the merchant's attribute axes alphabetically.
  const facetDefs: FacetDef[] = [];
  if (categoryOptions.length > 0) facetDefs.push({ id: "category", source: "category", label: t("category"), mode: "single", values: categoryOptions.map((option) => ({ key: option.slug, label: option.label, count: option.count })) });
  if (brandValues.length > 1) facetDefs.push({ id: "brand", source: "brand", label: t("brand"), mode: "single", values: brandValues });
  for (const axis of facets?.options ?? []) {
    if (axis.values.length === 0) continue;
    facetDefs.push({ id: `opt-${axis.key}`, source: "opt", axis: axis.key, label: localized(axis.name, locale), mode: "multi", values: axis.values.map((value) => ({ key: value.key, label: localized(value.label, locale), count: value.count })) });
  }
  [...(facets?.attributes ?? [])]
    .map((attribute) => ({ ...attribute, label: localized(attribute.name, locale) }))
    .filter((attribute) => attribute.values.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label, locale))
    .forEach((attribute) =>
      facetDefs.push({
        id: `attr-${attribute.key}`,
        source: "attr",
        axis: attribute.key,
        label: attribute.label,
        mode: "multi",
        values: attribute.values.map((value) => ({ key: value.key, label: localized(value.label, locale), count: value.count })).sort((a, b) => a.label.localeCompare(b.label, locale)),
      })
    );

  return (
    <div className="container-sf pt-5 lg:pt-8">
      {trail ? <Breadcrumbs trail={trail} className="mb-3 lg:mb-4" /> : null}

      <header className="gingham relative overflow-hidden rounded-panel px-5 py-5 lg:px-10 lg:py-7">
        <Bow className="pointer-events-none absolute -end-3 top-1/2 w-24 -translate-y-1/2 rotate-[8deg] rtl:-scale-x-100 rtl:-rotate-[8deg] lg:end-8 lg:w-44" />
        <div className="relative flex flex-col gap-1.5 pe-16 pt-2 lg:pe-52 lg:pt-0">
          <h1 className="t-title">
            <TitleWithHeart title={title} />
          </h1>
          {description ? <p className="max-w-2xl text-ink-secondary">{description}</p> : null}
          {/* The one live region: the count changes as filters apply, and screen readers hear it. */}
          <p role="status" className="tabular text-[0.9375rem] text-ink-secondary">
            {ui("count", { n: total, shown: formatNumber(locale, total) })}
          </p>
        </div>
      </header>

      {categoryOptions.length > 0 ? (
        <div className="mt-5 lg:mt-6">
          <CategoryRail locale={locale} basePath={basePath} state={state} categories={categoryOptions} />
        </div>
      ) : null}

      {/* No wrapper: the bar sticks to the viewport only for as long as its parent is tall — the page itself. */}
      <ListingControls basePath={basePath} state={state} facets={facetDefs} priceRange={facets?.priceRange} currency={currency} inStockCount={facets?.inStockCount ?? 0} total={total} />

      {chips.length ? (
        <ul aria-label={ui("applied")} className="mb-6 mt-2 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <li key={chip.key}>
              <Link href={chip.href} scroll={false} className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-action bg-blush ps-4 pe-3 text-[0.875rem] font-medium text-heading transition-colors duration-[var(--sf-duration-fast)] ease-standard hover:bg-blush-soft" aria-label={t("removeFilter", { label: chip.label })}>
                {chip.label}
                <X className="size-4" aria-hidden="true" />
              </Link>
            </li>
          ))}
          <li>
            <Link href={`${basePath}${toSearch({ sort: state.sort, q: chips.some((chip) => chip.key === "q") ? undefined : state.q })}`} scroll={false} className="inline-flex min-h-11 items-center px-3 text-[0.875rem] font-semibold text-action-ink underline-offset-4 hover:underline">
              {t("clearAll")}
            </Link>
          </li>
        </ul>
      ) : (
        <div className="h-4" />
      )}

      {products.length > 0 ? (
        <>
          <ListingAnalytics listId={listId} productIds={products.map((product) => product.id)} searchQuery={state.q} resultCount={total} />
          <ul className="grid grid-cols-2 gap-x-2.5 gap-y-6 md:grid-cols-3 md:gap-x-4 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-8 xl:grid-cols-5">
            {products.map((product, index) => (
              <ProductCard key={product.slug} as="li" subgrid product={product} priority={index < 2} sizes="(min-width: 1280px) 19vw, (min-width: 1024px) 24vw, (min-width: 768px) 31vw, 47vw" />
            ))}
          </ul>
          {totalPages > 1 ? (
            <nav aria-label={t("pagination")} className="mt-10 flex items-center justify-center gap-3">
              {state.page > 1 ? (
                <Link href={`${basePath}${toSearch({ ...state, page: state.page - 1 })}`} className="btn btn-secondary" rel="prev">
                  {t("previousPage")}
                </Link>
              ) : null}
              <span className="tabular text-[0.9375rem] text-ink-secondary">{t("pageOf", { page: formatNumber(locale, state.page), pages: formatNumber(locale, totalPages) })}</span>
              {state.page < totalPages ? (
                <Link href={`${basePath}${toSearch({ ...state, page: state.page + 1 })}`} className="btn btn-secondary" rel="next">
                  {t("nextPage")}
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      ) : filtered ? (
        <div className="flex flex-col items-start gap-4 rounded-panel bg-panel p-6 lg:p-10">
          <h2 className="t-heading">{t("noMatchesTitle")}</h2>
          <p className="text-ink-secondary">{state.q ? t("noMatchesBody", { q: state.q }) : t("noMatchesFilters")}</p>
          {narrowest ? (
            <Link href={narrowest.href} className="btn btn-primary">
              {t("dropNarrowest", { label: narrowest.label })}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-4 rounded-panel bg-panel p-6 lg:p-10">
          <h2 className="t-heading">{t("nothingYetTitle")}</h2>
          <p className="text-ink-secondary">{t("nothingYetBody")}</p>
          <Link href="/" className="btn btn-secondary">
            {t("backToShop")}
          </Link>
        </div>
      )}
    </div>
  );
}
