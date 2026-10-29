"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowUpDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { formatNumber, t } from "../format";
import { getDictionary } from "../i18n";
import { facets, runQuery, type CatalogQuery, type SortKey } from "../mock-api/catalog-query";
import type { Locale } from "../types";
import { ProductCard } from "../components/product-card";
import { Sheet } from "../components/sheet";

const SORTS: SortKey[] = ["relevance", "priceAsc", "priceDesc", "newest"];

function toSearch(query: CatalogQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.collection) params.set("collection", query.collection);
  query.size?.forEach((value) => params.append("size", value));
  query.colour?.forEach((value) => params.append("colour", value));
  if (query.price) params.set("price", query.price);
  if (query.sort && query.sort !== "relevance") params.set("sort", query.sort);
  const value = params.toString();
  return value ? `?${value}` : "";
}

/**
 * Listing (MDS §6.2, design §13b): the grid, search, facets and sort. Filters
 * live in the URL so a filtered view is shareable. Phone: a Filter / Sort bar
 * under the header; Filter opens a bottom sheet whose button reads the live
 * result count, so a filter that would empty the grid is seen before it is
 * applied. Desktop: facets in a side column. Applied filters are chips.
 */
export function ListingView({ locale, initial }: { locale: Locale; initial: CatalogQuery }) {
  const dict = getDictionary(locale);
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState<CatalogQuery>(initial);
  const [draft, setDraft] = useState<CatalogQuery>(initial);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const results = useMemo(() => runQuery(query, locale), [query, locale]);
  const draftCount = useMemo(() => runQuery(draft, locale).length, [draft, locale]);
  const facetData = useMemo(() => facets(query, locale), [query, locale]);
  const draftFacets = useMemo(() => facets(draft, locale), [draft, locale]);

  const commit = (next: CatalogQuery) => {
    setQuery(next);
    setDraft(next);
    router.replace(`${pathname}${toSearch(next)}`, { scroll: false });
  };

  const chips = [
    ...(query.q ? [{ key: "q", label: query.q, drop: { ...query, q: undefined } }] : []),
    ...(query.category && facetData.categoryName ? [{ key: "category", label: t(facetData.categoryName, locale), drop: { ...query, category: undefined } }] : []),
    ...(query.collection && facetData.collectionName ? [{ key: "collection", label: t(facetData.collectionName, locale), drop: { ...query, collection: undefined } }] : []),
    ...(query.size ?? []).map((size) => ({ key: `size-${size}`, label: `${dict.size} ${size}`, drop: { ...query, size: query.size?.filter((value) => value !== size) } })),
    ...(query.colour ?? []).map((colour) => ({ key: `colour-${colour}`, label: t(facetData.colours.find((c) => c.value === colour)?.label, locale), drop: { ...query, colour: query.colour?.filter((value) => value !== colour) } })),
    ...(query.price ? [{ key: "price", label: t(facetData.prices.find((band) => band.value === query.price)?.label, locale), drop: { ...query, price: undefined } }] : []),
  ];

  const title = facetData.collectionName ? t(facetData.collectionName, locale) : facetData.categoryName ? t(facetData.categoryName, locale) : query.q ? `${dict.search}: «${query.q}»` : dict.shopAll;
  const sortLabel = { relevance: dict.sortRelevance, priceAsc: dict.sortPriceAsc, priceDesc: dict.sortPriceDesc, newest: dict.sortNewest };

  // The narrowest applied filter is the one that, removed, brings back the most products.
  const narrowest = chips.length ? chips.reduce((best, chip) => (runQuery(chip.drop, locale).length > runQuery(best.drop, locale).length ? chip : best)) : null;

  return (
    <div className="container-sf pt-6 lg:pt-10">
      <div className="mb-5 flex flex-col gap-3 lg:mb-10">
        <h1 className="t-title">{title}</h1>
        <div className="rule" aria-hidden="true" />
        <div className="flex items-center justify-between gap-4">
          <p className="text-[0.9375rem] text-ink-secondary" aria-live="polite">
            {dict.productsCount(formatNumber(locale, results.length))}
          </p>
          {/* Desktop: sort sits beside the count it reorders. On a phone the Sort trigger lives in the sticky bar below. */}
          <label className="hidden items-center gap-2 text-[0.9375rem] lg:flex">
            <span className="text-ink-muted">{dict.sort}</span>
            <select
              value={query.sort ?? "relevance"}
              onChange={(event) => commit({ ...query, sort: event.target.value as SortKey })}
              className="min-h-11 cursor-pointer border-0 border-b border-line-strong bg-transparent pe-1 font-medium text-ink hover:border-ink focus-visible:border-ink"
            >
              {SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {sortLabel[sort]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Phone bar: Filter + Sort, sticky under the header. */}
      <div className="sticky top-[var(--sf-header-height)] z-20 -mx-[var(--sf-gutter)] mb-4 grid grid-cols-2 border-y border-line bg-canvas lg:hidden">
        <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex min-h-12 items-center justify-center gap-2 border-e border-line font-medium">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {dict.filter}
          {chips.length ? <span className="tabular rounded-full bg-ink px-1.5 text-[0.75rem] leading-5 text-canvas">{formatNumber(locale, chips.length)}</span> : null}
        </button>
        <button type="button" onClick={() => setSortOpen(true)} className="inline-flex min-h-12 items-center justify-center gap-2 font-medium">
          <ArrowUpDown className="size-4" aria-hidden="true" />
          {sortLabel[query.sort ?? "relevance"]}
        </button>
      </div>

      {chips.length ? (
        <ul className="mb-6 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <li key={chip.key}>
              <button type="button" onClick={() => commit(chip.drop)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line-strong ps-3.5 pe-2.5 text-[0.875rem]" aria-label={dict.removeFilter(chip.label)}>
                {chip.label}
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => commit({ sort: query.sort })} className="inline-flex min-h-10 items-center px-2 text-[0.875rem] font-medium text-action underline-offset-4 hover:underline">
              {dict.clearAll}
            </button>
          </li>
        </ul>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden lg:block" aria-label={dict.filter}>
          <div className="sticky top-[calc(72px+1.5rem)] flex flex-col gap-6">
            <label className="relative block">
              <span className="sr-only">{dict.search}</span>
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input type="search" defaultValue={query.q} placeholder={dict.searchPlaceholder} className="field ps-9 text-[0.9375rem]" onKeyDown={(event) => event.key === "Enter" && commit({ ...query, q: event.currentTarget.value || undefined })} />
            </label>
            <FacetGroups locale={locale} query={query} data={facetData} onChange={commit} />
          </div>
        </aside>

        <div>
          {results.length > 0 ? (
            <ul className="grid grid-cols-2 gap-x-2.5 gap-y-6 md:grid-cols-3 md:gap-x-4 lg:gap-x-5 lg:gap-y-8 2xl:grid-cols-4">
              {results.map((product) => (
                <ProductCard key={product.slug} as="li" subgrid product={product} locale={locale} />
              ))}
            </ul>
          ) : (
            // §15 "No filter matches": what was searched, what is applied, and one tap to drop the narrowest filter.
            <div className="flex flex-col items-start gap-4 border border-line bg-surface p-6 lg:p-10">
              <h2 className="t-heading">{dict.noMatchesTitle}</h2>
              <p className="text-ink-secondary">{dict.noMatchesBody(query.q ?? "")}</p>
              {narrowest ? (
                <button type="button" className="btn btn-primary" onClick={() => commit(narrowest.drop)}>
                  {dict.dropNarrowest(narrowest.label)}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <Sheet
        open={filtersOpen}
        onClose={() => {
          setDraft(query);
          setFiltersOpen(false);
        }}
        side="bottom"
        title={dict.filter}
        closeLabel={dict.close}
        footer={
          <div className="flex gap-3">
            <button type="button" className="btn btn-secondary" onClick={() => setDraft({ sort: query.sort })}>
              {dict.clearAll}
            </button>
            <button
              type="button"
              className="btn btn-primary flex-1"
              disabled={draftCount === 0}
              onClick={() => {
                commit(draft);
                setFiltersOpen(false);
              }}
            >
              {dict.showProducts(formatNumber(locale, draftCount))}
            </button>
          </div>
        }
      >
        <FacetGroups locale={locale} query={draft} data={draftFacets} onChange={setDraft} />
      </Sheet>

      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} side="bottom" title={dict.sort} closeLabel={dict.close}>
        <ul className="flex flex-col">
          {SORTS.map((sort) => (
            <li key={sort} className="border-b border-line">
              <button
                type="button"
                aria-pressed={(query.sort ?? "relevance") === sort}
                onClick={() => {
                  commit({ ...query, sort });
                  setSortOpen(false);
                }}
                className={cn("flex min-h-14 w-full items-center justify-between text-start", (query.sort ?? "relevance") === sort && "font-semibold")}
              >
                {sortLabel[sort]}
                {(query.sort ?? "relevance") === sort ? <span className="size-2.5 rounded-full bg-action" aria-hidden="true" /> : null}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

type FacetData = ReturnType<typeof facets>;

function FacetGroups({ locale, query, data, onChange }: { locale: Locale; query: CatalogQuery; data: FacetData; onChange(next: CatalogQuery): void }) {
  const dict = getDictionary(locale);
  const toggle = (list: string[] | undefined, value: string) => (list?.includes(value) ? list.filter((item) => item !== value) : [...(list ?? []), value]);
  const option = (active: boolean, disabled: boolean) =>
    cn("inline-flex min-h-11 items-center gap-2 rounded-[var(--sf-radius-control)] border px-3 text-[0.9375rem]", active ? "border-ink bg-ink text-canvas" : "border-line-strong", disabled && !active && "text-ink-muted");

  const row = "-mx-3 flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[var(--sf-radius-control)] px-3 text-[0.9375rem] transition-colors duration-[var(--sf-duration-fast)] hover:bg-surface-muted has-[:checked]:bg-surface-muted has-[:checked]:font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus";

  return (
    <div className="flex flex-col divide-y divide-line">
      <fieldset className="pb-6">
        <legend className="float-start mb-2 w-full p-0 font-semibold">{dict.category}</legend>
        <div className="clear-both" />
        {data.categories.map((facet) => (
          <label key={facet.value} className={row}>
            <span className="flex items-center gap-2.5">
              <input type="radio" name={`category-${locale}`} checked={query.category === facet.value} onChange={() => onChange({ ...query, category: facet.value })} className="size-4 accent-[var(--sf-action)]" />
              {t(facet.label, locale)}
            </span>
            <span className="tabular text-[0.875rem] font-normal text-ink-muted">{formatNumber(locale, facet.count)}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="py-6">
        <legend className="float-start mb-3 w-full p-0 font-semibold">{dict.size}</legend>
        <div className="clear-both flex flex-wrap gap-2">
          {data.sizes.map((facet) => (
            <button key={facet.value} type="button" aria-pressed={!!query.size?.includes(facet.value)} className={cn(option(!!query.size?.includes(facet.value), facet.count === 0), "active:scale-95")} onClick={() => onChange({ ...query, size: toggle(query.size, facet.value) })}>
              {facet.value}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="py-6">
        <legend className="float-start mb-3 w-full p-0 font-semibold">{dict.colour}</legend>
        <div className="clear-both flex flex-wrap gap-2">
          {data.colours.map((facet) => (
            <button key={facet.value} type="button" aria-pressed={!!query.colour?.includes(facet.value)} className={cn(option(!!query.colour?.includes(facet.value), facet.count === 0), "active:scale-95")} onClick={() => onChange({ ...query, colour: toggle(query.colour, facet.value) })}>
              <span className="size-4 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.15)]" style={{ background: facet.swatch }} aria-hidden="true" />
              {t(facet.label, locale)}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="pt-6">
        <legend className="float-start mb-2 w-full p-0 font-semibold">{dict.priceRange}</legend>
        <div className="clear-both" />
        {data.prices.map((facet) => (
          <label key={facet.value} className={row}>
            <span className="flex items-center gap-2.5">
              <input type="radio" name={`price-${locale}`} checked={query.price === facet.value} onChange={() => onChange({ ...query, price: facet.value })} className="size-4 accent-[var(--sf-action)]" />
              <span className="tabular">{t(facet.label, locale)}</span>
            </span>
            <span className="tabular text-[0.875rem] font-normal text-ink-muted">{formatNumber(locale, facet.count)}</span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
