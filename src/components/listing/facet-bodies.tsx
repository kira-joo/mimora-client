"use client";

import { Check } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { facetClear, facetSelected, facetToggle, type FacetDef } from "@/lib/catalog/listing-facets";
import { boundToPosition, positionToBound, priceProblem, type SliderScale } from "@/lib/catalog/listing-price";
import type { ListingState } from "@/lib/catalog/listing-query";
import { SORTS } from "@/lib/catalog/listing-query";
import { formatNumber, formatPrice } from "@/lib/format/numerals";
import type { Locale } from "@/i18n/routing";

const chip =
  "group inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border border-line-strong bg-surface px-4 text-[0.9375rem] transition-colors duration-[var(--sf-duration-fast)] ease-standard hover:bg-blush-soft has-[:checked]:border-action has-[:checked]:bg-blush has-[:checked]:font-semibold has-[:checked]:text-heading has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus";

export const SORT_KEY = { newest: "sortNewest", price_asc: "sortPriceAsc", price_desc: "sortPriceDesc" } as const;

/** One choice facet as a wrap of pill choices: real radios (one) or checkboxes (any), so arrows / Space work natively. */
export function ChoiceChips({ def, state, onChange, scope }: { def: FacetDef; state: ListingState; onChange(next: ListingState): void; scope: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const chosen = facetSelected(def, state);
  const single = def.mode === "single";
  const name = `${scope}-${def.id}`;
  const allLabel = def.source === "brand" ? t("allBrands") : t("allCategories");
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{def.label}</legend>
      <ul className="flex flex-wrap gap-2">
        {single ? (
          <li>
            <label className={chip}>
              <input type="radio" name={name} className="sr-only" checked={chosen.length === 0} onChange={() => onChange(facetClear(def, state))} />
              <Check className="hidden size-4 group-has-[:checked]:block" aria-hidden="true" />
              {allLabel}
            </label>
          </li>
        ) : null}
        {def.values.map((value) => (
          <li key={value.key}>
            <label className={chip}>
              <input type={single ? "radio" : "checkbox"} name={name} className="sr-only" checked={chosen.includes(value.key)} onChange={() => onChange(facetToggle(def, state, value.key))} />
              <Check className="hidden size-4 group-has-[:checked]:block" aria-hidden="true" />
              {value.label}
              <span className="tabular text-[0.8125rem] font-normal text-ink-secondary">{formatNumber(locale, value.count)}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

/** The sort order as a native radio group — selecting one applies it at once. */
export function SortList({ value, onSelect, scope }: { value: ListingState["sort"]; onSelect(sort: ListingState["sort"]): void; scope: string }) {
  const t = useTranslations("common");
  return (
    <fieldset>
      <legend className="sr-only">{t("sort")}</legend>
      <ul className="flex flex-col gap-1">
        {SORTS.map((sort) => (
          <li key={sort}>
            <label className="group flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-control px-3 text-[0.9375rem] transition-colors duration-[var(--sf-duration-fast)] ease-standard hover:bg-blush-soft has-[:checked]:bg-blush has-[:checked]:font-semibold has-[:checked]:text-heading has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus">
              <input type="radio" name={`${scope}-sort`} className="sr-only" checked={value === sort} onChange={() => onSelect(sort)} />
              {t(SORT_KEY[sort])}
              <Check className="invisible size-4 group-has-[:checked]:visible" aria-hidden="true" />
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

/** A switch-like pill for the in-stock facet (one checkbox), used in the phone sheet. */
export function StockSwitch({ checked, onChange, count, scope }: { checked: boolean; onChange(next: boolean): void; count: number; scope: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  return (
    <label className={cn(chip, "w-full justify-between rounded-control py-2")}>
      <input type="checkbox" name={`${scope}-inStock`} className="sr-only" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="flex flex-col">
        <span className="flex items-center gap-2">
          <Check className="hidden size-4 group-has-[:checked]:block" aria-hidden="true" />
          {t("catalogExtras.inStockOnly")}
        </span>
        <span className="text-[0.8125rem] font-normal text-ink-secondary">{t("catalogExtras.inStockOnlyHint")}</span>
      </span>
      <span className="tabular text-[0.875rem] font-normal text-ink-secondary">{formatNumber(locale, count)}</span>
    </label>
  );
}

interface PriceRangeProps {
  min: string | undefined;
  max: string | undefined;
  scale: SliderScale | null;
  currency: string;
  onChange(min: string | undefined, max: string | undefined): void;
  /** Told whenever the typed pair cannot be sent, so the surrounding Apply can wait. */
  onInvalid?(invalid: boolean): void;
}

/**
 * Price: two pearls on a ribbon over the catalog's own price range, a readout
 * of the span chosen, and two typed fields for an exact number. The slider and
 * the fields edit the same two bounds; a pearl resting on the rail's end means
 * "no limit on that side". Invalid or inverted bounds are said aloud, not sent.
 */
export function PriceRange({ min, max, scale, currency, onChange, onInvalid }: PriceRangeProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const ui = useTranslations("common.listingUi");
  const id = useId();
  const [minText, setMinText] = useState(min ?? "");
  const [maxText, setMaxText] = useState(max ?? "");
  // A bound changed from outside (slider, reset, new URL) replaces the typed text — adjusted during render, not in an effect.
  const [syncedMin, setSyncedMin] = useState(min);
  if (min !== syncedMin) {
    setSyncedMin(min);
    setMinText(min ?? "");
  }
  const [syncedMax, setSyncedMax] = useState(max);
  if (max !== syncedMax) {
    setSyncedMax(max);
    setMaxText(max ?? "");
  }
  const problem = priceProblem(minText, maxText);
  useEffect(() => {
    onInvalid?.(problem !== null);
    return () => onInvalid?.(false);
  }, [problem, onInvalid]);

  const lo = scale ? boundToPosition(min, scale, "min") : 0;
  const hi = scale ? boundToPosition(max, scale, "max") : 0;
  const pct = (value: number) => (scale ? ((value - scale.min) / (scale.max - scale.min)) * 100 : 0);
  const show = (position: number, bound: string | undefined) => (bound ? formatPrice(locale, String(position), currency) : null);
  const readout = scale ? `${show(lo, min) ?? formatPrice(locale, String(scale.min), currency)} – ${show(hi, max) ?? formatPrice(locale, String(scale.max), currency)}` : null;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">{t("priceRange")}</legend>
      {scale ? (
        <>
          <p className="t-heading tabular text-heading" aria-hidden="true">
            {readout}
          </p>
          <div className="sf-range" role="group" aria-label={ui("priceSlider")}>
            <div className="sf-range-rail" aria-hidden="true">
              <div className="sf-range-fill" style={{ insetInlineStart: `${pct(lo)}%`, insetInlineEnd: `${100 - pct(hi)}%` }} />
            </div>
            <input
              type="range"
              aria-label={ui("priceMinimum")}
              min={scale.min}
              max={scale.max}
              step={scale.step}
              value={lo}
              style={{ zIndex: lo > (scale.min + scale.max) / 2 ? 2 : 1 }}
              onChange={(event) => onChange(positionToBound(Math.min(Number(event.target.value), hi - scale.step), scale, "min"), max)}
            />
            <input
              type="range"
              aria-label={ui("priceMaximum")}
              min={scale.min}
              max={scale.max}
              step={scale.step}
              value={hi}
              onChange={(event) => onChange(min, positionToBound(Math.max(Number(event.target.value), lo + scale.step), scale, "max"))}
            />
          </div>
        </>
      ) : null}
      <div className="flex items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-[0.8125rem] text-ink-secondary" htmlFor={`${id}-min`}>
          {ui("priceMinimum")}
          <input
            id={`${id}-min`}
            inputMode="decimal"
            dir="ltr"
            autoComplete="off"
            placeholder={scale ? formatNumber(locale, scale.min) : undefined}
            value={minText}
            onChange={(event) => {
              const text = event.target.value.trim();
              setMinText(text);
              if (priceProblem(text, "") === null) onChange(text || undefined, max);
            }}
            className="field tabular text-center placeholder:text-ink-muted"
            aria-invalid={problem !== null || undefined}
            aria-describedby={problem ? `${id}-problem` : undefined}
          />
        </label>
        <span className="pb-3.5 text-ink-muted" aria-hidden="true">
          –
        </span>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-[0.8125rem] text-ink-secondary" htmlFor={`${id}-max`}>
          {ui("priceMaximum")}
          <input
            id={`${id}-max`}
            inputMode="decimal"
            dir="ltr"
            autoComplete="off"
            placeholder={scale ? formatNumber(locale, scale.max) : undefined}
            value={maxText}
            onChange={(event) => {
              const text = event.target.value.trim();
              setMaxText(text);
              if (priceProblem("", text) === null) onChange(min, text || undefined);
            }}
            className="field tabular text-center placeholder:text-ink-muted"
            aria-invalid={problem !== null || undefined}
            aria-describedby={problem ? `${id}-problem` : undefined}
          />
        </label>
      </div>
      <p id={`${id}-problem`} role="alert" className={cn("text-[0.8125rem] font-medium text-critical", !problem && "sr-only")}>
        {problem === "format" ? t("priceInvalid") : problem === "order" ? ui("priceOrder") : ""}
      </p>
    </fieldset>
  );
}
