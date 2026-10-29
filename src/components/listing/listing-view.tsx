import { X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import type { Crumb } from "@/lib/catalog/breadcrumbs";
import { ProductCard } from "@/components/product/product-card";
import type { Locale } from "@/i18n/routing";
import type { Brand, Category, CatalogFacets } from "@/lib/api/types";
import type { CardProduct } from "@/lib/catalog/card-model";
import { toSearch, type ListingState } from "@/lib/catalog/listing-query";
import { formatNumber, formatPrice, localized } from "@/lib/format/numerals";
import { ListingAnalytics } from "./listing-analytics";
import { FacetPanel, ListingControls, type AttributeOption, type CategoryOption } from "./listing-controls";

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
  categories: Category[];
  brands: Brand[];
  currency: string;
  chips: Chip[];
  /** Home › ancestors › this page — category, collection and brand pages. Absent on /products and /search. */
  trail?: Crumb[];
}

/**
 * Listing (MDS §6.2, design-system §13b): heading, count and sort together;
 * phone — a Filter / Sort bar; desktop — facets in a side column. Applied
 * filters are removable chips with a clear-all. Empty results are a designed
 * state: what was searched, what is applied, and one tap to drop the narrowest
 * filter (MDS §9). "Nothing here yet" and "nothing matches" are different words.
 */
export async function ListingView(props: ListingViewProps) {
  const { locale, title, description, basePath, state, products, total, totalPages, facets, categories, brands, currency, chips, trail } = props;
  const t = await getTranslations("common");
  const narrowest = chips.length ? chips.reduce((best, chip) => ((chip.count ?? 0) > (best.count ?? 0) ? chip : best)) : null;
  const filtered = chips.length > 0;
  // A stable name for what is shown: a search, a scope, or the whole catalog — for analytics only.
  const listId = state.q ? "search" : state.category ? `category:${state.category}` : state.collection ? `collection:${state.collection}` : state.brand ? `brand:${state.brand}` : "all";
  const priceHint = facets?.priceRange.min && facets.priceRange.max ? `${formatPrice(locale, facets.priceRange.min, currency)} – ${formatPrice(locale, facets.priceRange.max, currency)}` : undefined;

  const categoryOptions: CategoryOption[] = (facets?.categories ?? [])
    .map((facet) => {
      const category = categories.find((candidate) => candidate._id === facet.key);
      return category ? { slug: category.slug, label: localized(category.name, locale), count: facet.count, child: Boolean(category.parentId), sortOrder: category.sortOrder } : null;
    })
    .filter((option): option is CategoryOption & { sortOrder: number } => option !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const brandOptions = (facets?.brands ?? [])
    .map((facet) => {
      const brand = brands.find((candidate) => candidate._id === facet.key);
      return brand ? { slug: brand.slug, label: localized(brand.name, locale), count: facet.count } : null;
    })
    .filter((option): option is NonNullable<typeof option> => option !== null);
  // The merchant's own attribute axes (material, fit, …) — each value a checkbox with the products it would show.
  const attributeOptions: AttributeOption[] = (facets?.attributes ?? [])
    .map((attribute) => ({
      key: attribute.key,
      label: localized(attribute.name, locale),
      values: attribute.values.map((value) => ({ key: value.key, label: localized(value.label, locale), count: value.count })).sort((a, b) => a.label.localeCompare(b.label, locale)),
    }))
    .filter((attribute) => attribute.values.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label, locale));

  // Size / colour: each value a checkbox, in the merchant's own order (S, M, L — not alphabetical), counted over purchasable variants.
  const optionOptions: AttributeOption[] = (facets?.options ?? [])
    .map((axis) => ({ key: axis.key, label: localized(axis.name, locale), values: axis.values.map((value) => ({ key: value.key, label: localized(value.label, locale), count: value.count })) }))
    .filter((axis) => axis.values.length > 0);
  const inStockCount = facets?.inStockCount ?? 0;

  return (
    <div className="container-sf pt-6 lg:pt-10">
      {trail ? <Breadcrumbs trail={trail} className="mb-3 lg:mb-4" /> : null}
      <div className="mb-5 flex flex-col gap-3 lg:mb-10">
        <h1 className="t-title">{title}</h1>
        {description ? <p className="max-w-2xl text-ink-secondary">{description}</p> : null}
        <div className="rule" aria-hidden="true" />
        <ListingControls
          basePath={basePath}
          state={state}
          countLabel={t("productsCount", { n: formatNumber(locale, total) })}
          categories={categoryOptions}
          brands={brandOptions}
          attributes={attributeOptions}
          options={optionOptions}
          inStockCount={inStockCount}
          priceHint={priceHint}
          appliedCount={chips.length}
        />
      </div>

      {chips.length ? (
        <ul className="mb-6 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <li key={chip.key}>
              <Link href={chip.href} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line-strong ps-3.5 pe-2.5 text-[0.875rem]" aria-label={t("removeFilter", { label: chip.label })}>
                {chip.label}
                <X className="size-3.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
          <li>
            <Link href={`${basePath}${toSearch({ sort: state.sort })}`} className="inline-flex min-h-10 items-center px-2 text-[0.875rem] font-medium text-action underline-offset-4 hover:underline">
              {t("clearAll")}
            </Link>
          </li>
        </ul>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden lg:block" aria-label={t("filter")}>
          <div className="sticky top-[calc(72px+1.5rem)]">
            <FacetPanel basePath={basePath} state={state} categories={categoryOptions} brands={brandOptions} attributes={attributeOptions} options={optionOptions} inStockCount={inStockCount} priceHint={priceHint} mode="immediate" />
          </div>
        </aside>
        <div>
      {products.length > 0 ? (
        <>
          <ListingAnalytics listId={listId} productIds={products.map((product) => product.id)} searchQuery={state.q} resultCount={total} />
          <ul className="grid grid-cols-2 gap-x-2.5 gap-y-6 md:grid-cols-3 md:gap-x-4 lg:gap-x-5 lg:gap-y-8 2xl:grid-cols-4">
            {products.map((product, index) => (
              <ProductCard key={product.slug} as="li" subgrid product={product} priority={index < 2} />
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
        <div className="flex flex-col items-start gap-4 border border-line bg-surface p-6 lg:p-10">
          <h2 className="t-heading">{t("noMatchesTitle")}</h2>
          <p className="text-ink-secondary">{state.q ? t("noMatchesBody", { q: state.q }) : t("noMatchesFilters")}</p>
          {narrowest ? (
            <Link href={narrowest.href} className="btn btn-primary">
              {t("dropNarrowest", { label: narrowest.label })}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-4 border border-line bg-surface p-6 lg:p-10">
          <h2 className="t-heading">{t("nothingYetTitle")}</h2>
          <p className="text-ink-secondary">{t("nothingYetBody")}</p>
          <Link href="/" className="btn btn-secondary">
            {t("backToShop")}
          </Link>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
