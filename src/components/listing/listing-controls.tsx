"use client";

import { ArrowUpDown, Check, SlidersHorizontal } from "lucide-react";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { useRouter } from "@/i18n/navigation";
import { Sheet } from "@/components/ui/sheet";
import { appliedFilterCount, clearFilters, facetClear, facetSelected, type FacetDef } from "@/lib/catalog/listing-facets";
import { sliderScale } from "@/lib/catalog/listing-price";
import { toSearch, type ListingState } from "@/lib/catalog/listing-query";
import { formatNumber } from "@/lib/format/numerals";
import type { Locale } from "@/i18n/routing";
import { ChoiceChips, PriceRange, SORT_KEY, SortList, StockSwitch } from "./facet-bodies";
import { FilterPopover, pillClass } from "./filter-popover";

export type { FacetDef } from "@/lib/catalog/listing-facets";

interface ControlsProps {
  basePath: string;
  state: ListingState;
  /** Every choice facet (category, brand, size/colour, the merchant's attributes) — plain data built on the server. */
  facets: FacetDef[];
  priceRange?: { min?: string; max?: string };
  currency: string;
  /** Products in scope with a purchasable variant — the number beside the in-stock pill. */
  inStockCount: number;
  /** Products the applied filters show now. */
  total: number;
}

/**
 * The filter bar. Desktop: one row of pills — availability, price, then one
 * popover per facet, and the sort at the reading end (the categories are the
 * rail above, not a sidebar). Phone: a sticky Filters / Sort pair whose sheet
 * holds every facet. Every change is a navigation to a URL (listing state
 * lives in the query string, server-rendered); popovers and the sheet edit a
 * DRAFT and show the live result count of that draft before it is applied.
 */
export function ListingControls({ basePath, state, facets, priceRange, currency, inStockCount, total }: ControlsProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const ui = useTranslations("common.listingUi");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = (next: ListingState) => startTransition(() => router.push(`${basePath}${toSearch({ ...next, page: 1 })}`, { scroll: false }));

  const [openId, setOpenId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [draft, setDraft] = useState(state);
  const [priceInvalid, setPriceInvalid] = useState(false);
  // The draft follows the URL whenever the URL changes (adjusting state during render, not in an effect).
  const key = toSearch({ ...state, page: 1 });
  const [syncedKey, setSyncedKey] = useState(key);
  if (syncedKey !== key) {
    setSyncedKey(key);
    setDraft(state);
  }
  const scale = sliderScale(priceRange);
  const count = useDraftCount(openId !== null, draft, state, total);
  const applied = appliedFilterCount(state);

  function setOpen(id: string, open: boolean) {
    if (open) setOpenId(id);
    else {
      setOpenId((current) => (current === id ? null : current));
      setDraft(state);
    }
  }
  function apply() {
    setOpenId(null);
    navigate(draft);
  }

  const priceOn = Boolean(state.minPrice || state.maxPrice);
  const priceSummary = state.minPrice && state.maxPrice ? `${formatNumber(locale, Number(state.minPrice))}–${formatNumber(locale, Number(state.maxPrice))}` : state.minPrice ? `${t("priceFrom")} ${formatNumber(locale, Number(state.minPrice))}` : state.maxPrice ? `${t("priceTo")} ${formatNumber(locale, Number(state.maxPrice))}` : undefined;

  return (
    <section aria-label={ui("barLabel")} className="sticky top-[var(--sf-header-height)] z-20 -mx-[var(--sf-gutter)] mt-2 bg-canvas px-[var(--sf-gutter)] py-3">
      <div className="hidden flex-wrap items-center gap-2 lg:flex">
        <button type="button" aria-pressed={state.inStock} className={pillClass(state.inStock)} onClick={() => navigate({ ...state, inStock: !state.inStock })}>
          <Check className={cn("size-4", !state.inStock && "hidden")} aria-hidden="true" />
          {t("catalogExtras.inStockOnly")}
          <span className="tabular text-[0.8125rem] font-normal text-ink-secondary">{formatNumber(locale, inStockCount)}</span>
        </button>

        <FilterPopover open={openId === "price"} onOpenChange={(open) => setOpen("price", open)} label={t("priceRange")} summary={priceSummary} on={priceOn}>
          <PanelFrame
            count={count}
            disabled={priceInvalid}
            onApply={apply}
            onReset={() => setDraft({ ...draft, minPrice: undefined, maxPrice: undefined })}
            canReset={Boolean(draft.minPrice || draft.maxPrice)}
          >
            <PriceRange min={draft.minPrice} max={draft.maxPrice} scale={scale} currency={currency} onChange={(minPrice, maxPrice) => setDraft({ ...draft, minPrice, maxPrice })} onInvalid={setPriceInvalid} />
          </PanelFrame>
        </FilterPopover>

        {facets
          .filter((facet) => facet.source !== "category")
          .map((facet) => {
            const chosen = facetSelected(facet, state).length;
            return (
              <FilterPopover key={facet.id} open={openId === facet.id} onOpenChange={(open) => setOpen(facet.id, open)} label={facet.label} summary={chosen ? formatNumber(locale, chosen) : undefined} on={chosen > 0}>
                <PanelFrame count={count} onApply={apply} onReset={() => setDraft(facetClear(facet, draft))} canReset={facetSelected(facet, draft).length > 0}>
                  <ChoiceChips def={facet} state={draft} onChange={setDraft} scope="bar" />
                </PanelFrame>
              </FilterPopover>
            );
          })}

        <FilterPopover className="ms-auto" align="end" open={openId === "sort"} onOpenChange={(open) => setOpen("sort", open)} label={`${t("sort")}: ${t(SORT_KEY[state.sort])}`} on={state.sort !== "newest"}>
          <SortList
            value={state.sort}
            scope="bar"
            onSelect={(sort) => {
              setOpenId(null);
              navigate({ ...state, sort });
            }}
          />
        </FilterPopover>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:hidden">
        <button type="button" onClick={() => setFiltersOpen(true)} className={cn(pillClass(applied > 0), "justify-center")}>
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {t("filter")}
          {applied ? <span className="tabular rounded-pill bg-action px-2 text-[0.8125rem] leading-6 text-on-action">{formatNumber(locale, applied)}</span> : null}
        </button>
        <button type="button" onClick={() => setSortOpen(true)} className={cn(pillClass(state.sort !== "newest"), "justify-center")}>
          <ArrowUpDown className="size-4" aria-hidden="true" />
          {t(SORT_KEY[state.sort])}
        </button>
      </div>

      <span aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-action transition-opacity duration-[var(--sf-duration-standard)]", pending ? "opacity-100" : "opacity-0")} />

      <FilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} state={state} facets={facets} scale={scale} currency={currency} inStockCount={inStockCount} total={total} onApply={(next) => navigate(next)} />

      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} side="bottom" title={t("sort")} closeLabel={t("close")}>
        <SortList
          value={state.sort}
          scope="sheet"
          onSelect={(sort) => {
            setSortOpen(false);
            navigate({ ...state, sort });
          }}
        />
      </Sheet>
    </section>
  );
}

/** Popover body furniture: the facet, then Reset (this facet only) and Show N (the live count of the draft). */
function PanelFrame({ children, count, onApply, onReset, canReset, disabled = false }: { children: ReactNode; count: number | null; onApply(): void; onReset(): void; canReset: boolean; disabled?: boolean }) {
  const t = useTranslations("common");
  const ui = useTranslations("common.listingUi");
  const locale = useLocale() as Locale;
  return (
    <div className="flex flex-col gap-5">
      {children}
      <div className="flex items-center gap-3 border-t border-line pt-4">
        <button type="button" className="inline-flex min-h-11 items-center rounded-pill px-3 text-[0.9375rem] font-semibold text-action-ink underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-ink-muted disabled:no-underline" disabled={!canReset} onClick={onReset}>
          {ui("reset")}
        </button>
        <button type="button" className="btn btn-primary flex-1" disabled={disabled || count === 0} onClick={onApply}>
          {count === null ? t("showResults") : ui("show", { n: count, shown: formatNumber(locale, count) })}
        </button>
      </div>
    </div>
  );
}

/** The result count a draft would show: the page's own total while nothing differs, otherwise a short debounced look-up (cached product content on the server). `null` while it loads. */
function useDraftCount(active: boolean, draft: ListingState, applied: ListingState, total: number): number | null {
  const draftKey = toSearch({ ...draft, page: 1 });
  const dirty = draftKey !== toSearch({ ...applied, page: 1 });
  const [fetched, setFetched] = useState<{ key: string; total: number | null } | null>(null);

  useEffect(() => {
    if (!active || !dirty) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/catalog/count${draftKey}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((body: { total: number | null }) => setFetched({ key: draftKey, total: body.total }))
        .catch(() => undefined);
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, dirty, draftKey]);

  if (!dirty) return total;
  return fetched?.key === draftKey ? fetched.total : null;
}

function FilterSheet({ open, onClose, state, facets, scale, currency, inStockCount, total, onApply }: { open: boolean; onClose(): void; state: ListingState; facets: FacetDef[]; scale: ReturnType<typeof sliderScale>; currency: string; inStockCount: number; total: number; onApply(next: ListingState): void }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const ui = useTranslations("common.listingUi");
  const [draft, setDraft] = useState(state);
  const [priceInvalid, setPriceInvalid] = useState(false);
  const count = useDraftCount(open, draft, state, total);

  // Opening the sheet, or the applied state changing while it is open, restarts the draft from the applied state — adjusted during render, not in an effect.
  const [syncedWith, setSyncedWith] = useState({ open, state });
  if (syncedWith.open !== open || syncedWith.state !== state) {
    setSyncedWith({ open, state });
    if (open) setDraft(state);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      side="bottom"
      title={t("filter")}
      closeLabel={t("close")}
      footer={
        <div className="flex gap-3">
          <button type="button" className="btn btn-secondary" onClick={() => setDraft(clearFilters(draft))}>
            {t("clearAll")}
          </button>
          <button
            type="button"
            className="btn btn-primary flex-1"
            disabled={count === 0 || priceInvalid}
            onClick={() => {
              onClose();
              onApply(draft);
            }}
          >
            {count === null ? t("showResults") : ui("show", { n: count, shown: formatNumber(locale, count) })}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-7">
        <StockSwitch checked={draft.inStock} count={inStockCount} scope="sheet" onChange={(inStock) => setDraft({ ...draft, inStock })} />
        {facets.map((facet) => (
          <section key={facet.id} className="flex flex-col gap-3">
            <h3 className="t-heading">{facet.label}</h3>
            <ChoiceChips def={facet} state={draft} onChange={setDraft} scope="sheet" />
          </section>
        ))}
        <section className="flex flex-col gap-3">
          <h3 className="t-heading">{t("priceRange")}</h3>
          <PriceRange min={draft.minPrice} max={draft.maxPrice} scale={scale} currency={currency} onChange={(minPrice, maxPrice) => setDraft({ ...draft, minPrice, maxPrice })} onInvalid={setPriceInvalid} />
        </section>
      </div>
    </Sheet>
  );
}
