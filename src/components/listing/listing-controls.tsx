"use client";

import { useEffect, useState } from "react";
import { ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { useRouter } from "@/i18n/navigation";
import { Sheet } from "@/components/ui/sheet";
import { SORTS, selectedValues, toSearch, toggleAttribute, toggleOption, type ListingState } from "@/lib/catalog/listing-query";
import { formatNumber } from "@/lib/format/numerals";
import type { Locale } from "@/i18n/routing";

export interface CategoryOption {
  slug: string;
  label: string;
  count: number;
  child: boolean;
}

export interface BrandOption {
  slug: string;
  label: string;
  count: number;
}

export interface AttributeOption {
  key: string;
  label: string;
  values: Array<{ key: string; label: string; count: number }>;
}

const SORT_KEY = { newest: "sortNewest", price_asc: "sortPriceAsc", price_desc: "sortPriceDesc" } as const;
const MONEY = /^\d+(\.\d{1,2})?$/;

function useNavigateListing(basePath: string) {
  const router = useRouter();
  return (next: Partial<ListingState>) => router.push(`${basePath}${toSearch({ ...next, page: 1 })}`, { scroll: false });
}

interface ControlsProps {
  basePath: string;
  state: ListingState;
  countLabel: string;
  categories: CategoryOption[];
  brands: BrandOption[];
  attributes: AttributeOption[];
  /** Variant option axes (size, colour), in the merchant's order, counted over purchasable variants. */
  options: AttributeOption[];
  /** Products in scope with a purchasable variant — the number beside the in-stock toggle. */
  inStockCount: number;
  priceHint?: string;
  appliedCount: number;
}

/**
 * The count with the sort beside it (desktop), and on a phone a sticky
 * Filter / Sort bar whose Filter sheet shows the live result count of the
 * DRAFT before it is applied (design-system §13b).
 */
export function ListingControls({ basePath, state, countLabel, categories, brands, attributes, options, inStockCount, priceHint, appliedCount }: ControlsProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const navigate = useNavigateListing(basePath);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <p className="text-[0.9375rem] text-ink-secondary" aria-live="polite">
          {countLabel}
        </p>
        {/* Desktop: sort sits beside the count it reorders. On a phone the Sort trigger lives in the sticky bar below. */}
        <label className="hidden items-center gap-2 text-[0.9375rem] lg:flex">
          <span className="text-ink-muted">{t("sort")}</span>
          <select value={state.sort} onChange={(event) => navigate({ ...state, sort: event.target.value as ListingState["sort"] })} className="min-h-11 cursor-pointer border-0 border-b border-line-strong bg-transparent pe-1 font-medium text-ink hover:border-ink focus-visible:border-ink">
            {SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {t(SORT_KEY[sort])}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="sticky top-[var(--sf-header-height)] z-20 -mx-[var(--sf-gutter)] mt-2 grid grid-cols-2 border-y border-line bg-canvas lg:hidden">
        <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex min-h-12 items-center justify-center gap-2 border-e border-line font-medium">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {t("filter")}
          {appliedCount ? <span className="tabular rounded-full bg-ink px-1.5 text-[0.75rem] leading-5 text-canvas">{formatNumber(locale, appliedCount)}</span> : null}
        </button>
        <button type="button" onClick={() => setSortOpen(true)} className="inline-flex min-h-12 items-center justify-center gap-2 font-medium">
          <ArrowUpDown className="size-4" aria-hidden="true" />
          {t(SORT_KEY[state.sort])}
        </button>
      </div>

      <FilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} basePath={basePath} state={state} categories={categories} brands={brands} attributes={attributes} options={options} inStockCount={inStockCount} priceHint={priceHint} />

      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} side="bottom" title={t("sort")} closeLabel={t("close")}>
        <ul className="flex flex-col">
          {SORTS.map((sort) => (
            <li key={sort} className="border-b border-line">
              <button
                type="button"
                aria-pressed={state.sort === sort}
                onClick={() => {
                  setSortOpen(false);
                  navigate({ ...state, sort });
                }}
                className={cn("flex min-h-14 w-full items-center justify-between text-start", state.sort === sort && "font-semibold")}
              >
                {t(SORT_KEY[sort])}
                {state.sort === sort ? <span className="size-2.5 rounded-full bg-action" aria-hidden="true" /> : null}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}

function FilterSheet({ open, onClose, basePath, state, categories, brands, attributes, options, inStockCount, priceHint }: { open: boolean; onClose(): void; basePath: string; state: ListingState; categories: CategoryOption[]; brands: BrandOption[]; attributes: AttributeOption[]; options: AttributeOption[]; inStockCount: number; priceHint?: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const navigate = useNavigateListing(basePath);
  const [draft, setDraft] = useState<ListingState>(state);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (open) setDraft(state);
  }, [open, state]);

  // The live count of the draft — product content, cached on the server; aborted when the draft changes again.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setCount(null);
    fetch(`/api/catalog/count${toSearch({ ...draft, page: 1 })}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((body: { total: number | null }) => setCount(body.total))
      .catch(() => undefined);
    return () => controller.abort();
  }, [open, draft]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      side="bottom"
      title={t("filter")}
      closeLabel={t("close")}
      footer={
        <div className="flex gap-3">
          <button type="button" className="btn btn-secondary" onClick={() => setDraft({ sort: state.sort, page: 1, q: state.q, attr: [], opt: [], inStock: false })}>
            {t("clearAll")}
          </button>
          <button
            type="button"
            className="btn btn-primary flex-1"
            disabled={count === 0}
            onClick={() => {
              onClose();
              navigate(draft);
            }}
          >
            {count === null ? t("showResults") : t("showProducts", { n: formatNumber(locale, count) })}
          </button>
        </div>
      }
    >
      <FacetPanel basePath={basePath} state={draft} categories={categories} brands={brands} attributes={attributes} options={options} inStockCount={inStockCount} priceHint={priceHint} mode="draft" onDraft={setDraft} />
    </Sheet>
  );
}

interface FacetPanelProps {
  basePath: string;
  state: ListingState;
  categories: CategoryOption[];
  brands: BrandOption[];
  attributes: AttributeOption[];
  options: AttributeOption[];
  inStockCount: number;
  priceHint?: string;
  /** `immediate` (desktop column) navigates on each change; `draft` (phone sheet) only updates the draft. */
  mode: "immediate" | "draft";
  onDraft?: (next: ListingState) => void;
}

/** The supported facets — in stock, category, brand, size/colour, the merchant's attribute axes, price — and nothing the backend cannot actually filter on. */
export function FacetPanel({ basePath, state, categories, brands, attributes, options, inStockCount, priceHint, mode, onDraft }: FacetPanelProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const navigate = useNavigateListing(basePath);
  const apply = (next: ListingState) => (mode === "immediate" ? navigate(next) : onDraft?.(next));
  const [min, setMin] = useState(state.minPrice ?? "");
  const [max, setMax] = useState(state.maxPrice ?? "");
  useEffect(() => {
    setMin(state.minPrice ?? "");
    setMax(state.maxPrice ?? "");
  }, [state.minPrice, state.maxPrice]);
  const priceValid = (!min || MONEY.test(min)) && (!max || MONEY.test(max));

  const row =
    "-mx-3 flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[var(--sf-radius-control)] px-3 text-[0.9375rem] transition-colors duration-[var(--sf-duration-fast)] hover:bg-surface-muted has-[:checked]:bg-surface-muted has-[:checked]:font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus";
  const name = (group: string) => `${group}-${mode}`;

  return (
    <div className="flex flex-col divide-y divide-line">
      {/* Availability first: the one facet that is about whether you can buy it at all. */}
      <fieldset className="pb-6">
        <legend className="sr-only">{t("catalogExtras.inStockOnly")}</legend>
        <label className={row}>
          <span className="flex items-center gap-2.5">
            <input type="checkbox" name={name("inStock")} checked={state.inStock} onChange={() => apply({ ...state, inStock: !state.inStock })} className="size-4 accent-[var(--sf-action)]" />
            <span className="flex flex-col">
              {t("catalogExtras.inStockOnly")}
              <span className="text-[0.8125rem] font-normal text-ink-muted">{t("catalogExtras.inStockOnlyHint")}</span>
            </span>
          </span>
          <span className="tabular text-[0.875rem] font-normal text-ink-muted">{formatNumber(locale, inStockCount)}</span>
        </label>
      </fieldset>
      {categories.length > 0 ? (
        <fieldset className="py-6">
          <legend className="float-start mb-2 w-full p-0 font-semibold">{t("category")}</legend>
          <div className="clear-both" />
          <label className={row}>
            <span className="flex items-center gap-2.5">
              <input type="radio" name={name("category")} checked={!state.category} onChange={() => apply({ ...state, category: undefined })} className="size-4 accent-[var(--sf-action)]" />
              {t("allCategories")}
            </span>
          </label>
          {categories.map((facet) => (
            <label key={facet.slug} className={cn(row, facet.child && "ps-7")}>
              <span className="flex items-center gap-2.5">
                <input type="radio" name={name("category")} checked={state.category === facet.slug} onChange={() => apply({ ...state, category: facet.slug })} className="size-4 accent-[var(--sf-action)]" />
                {facet.label}
              </span>
              <span className="tabular text-[0.875rem] font-normal text-ink-muted">{formatNumber(locale, facet.count)}</span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {brands.length > 1 ? (
        <fieldset className="py-6">
          <legend className="float-start mb-2 w-full p-0 font-semibold">{t("brand")}</legend>
          <div className="clear-both" />
          <label className={row}>
            <span className="flex items-center gap-2.5">
              <input type="radio" name={name("brand")} checked={!state.brand} onChange={() => apply({ ...state, brand: undefined })} className="size-4 accent-[var(--sf-action)]" />
              {t("allBrands")}
            </span>
          </label>
          {brands.map((facet) => (
            <label key={facet.slug} className={row}>
              <span className="flex items-center gap-2.5">
                <input type="radio" name={name("brand")} checked={state.brand === facet.slug} onChange={() => apply({ ...state, brand: facet.slug })} className="size-4 accent-[var(--sf-action)]" />
                {facet.label}
              </span>
              <span className="tabular text-[0.875rem] font-normal text-ink-muted">{formatNumber(locale, facet.count)}</span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {options.map((axis) => {
        const chosen = selectedValues(state.opt, axis.key);
        return (
          <fieldset key={`opt-${axis.key}`} className="py-6">
            <legend className="float-start mb-2 w-full p-0 font-semibold">{axis.label}</legend>
            <div className="clear-both" />
            {axis.values.map((value) => (
              <label key={value.key} className={row}>
                <span className="flex items-center gap-2.5">
                  <input type="checkbox" name={name(`opt-${axis.key}`)} checked={chosen.includes(value.key)} onChange={() => apply({ ...state, opt: toggleOption(state.opt, axis.key, value.key) })} className="size-4 accent-[var(--sf-action)]" />
                  {value.label}
                </span>
                <span className="tabular text-[0.875rem] font-normal text-ink-muted">{formatNumber(locale, value.count)}</span>
              </label>
            ))}
          </fieldset>
        );
      })}
      {attributes.map((attribute) => {
        const chosen = selectedValues(state.attr, attribute.key);
        return (
          <fieldset key={attribute.key} className="py-6">
            <legend className="float-start mb-2 w-full p-0 font-semibold">{attribute.label}</legend>
            <div className="clear-both" />
            {attribute.values.map((value) => (
              <label key={value.key} className={row}>
                <span className="flex items-center gap-2.5">
                  <input type="checkbox" name={name(`attr-${attribute.key}`)} checked={chosen.includes(value.key)} onChange={() => apply({ ...state, attr: toggleAttribute(state.attr, attribute.key, value.key) })} className="size-4 accent-[var(--sf-action)]" />
                  {value.label}
                </span>
                <span className="tabular text-[0.875rem] font-normal text-ink-muted">{formatNumber(locale, value.count)}</span>
              </label>
            ))}
          </fieldset>
        );
      })}
      <fieldset className="pt-6">
        <legend className="float-start mb-1 w-full p-0 font-semibold">{t("priceRange")}</legend>
        {priceHint ? <p className="clear-both mb-3 text-[0.8125rem] text-ink-muted">{priceHint}</p> : <div className="clear-both" />}
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (priceValid) apply({ ...state, minPrice: min || undefined, maxPrice: max || undefined });
          }}
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-[0.8125rem] text-ink-secondary">
            {t("priceFrom")}
            <input inputMode="decimal" dir="ltr" value={min} onChange={(event) => setMin(event.target.value.trim())} onBlur={() => mode === "draft" && priceValid && apply({ ...state, minPrice: min || undefined })} className="field tabular" aria-invalid={!priceValid || undefined} />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-[0.8125rem] text-ink-secondary">
            {t("priceTo")}
            <input inputMode="decimal" dir="ltr" value={max} onChange={(event) => setMax(event.target.value.trim())} onBlur={() => mode === "draft" && priceValid && apply({ ...state, maxPrice: max || undefined })} className="field tabular" aria-invalid={!priceValid || undefined} />
          </label>
          {mode === "immediate" ? (
            <button type="submit" className="btn btn-secondary min-h-12 px-3" disabled={!priceValid}>
              {t("apply")}
            </button>
          ) : null}
        </form>
        {!priceValid ? <p className="mt-2 text-[0.8125rem] font-medium text-critical">{t("priceInvalid")}</p> : null}
      </fieldset>
    </div>
  );
}
