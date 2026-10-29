"use client";

import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { t } from "../format";
import { getDictionary } from "../i18n";
import { valueState, type Selection } from "../lib/variant-selection";
import type { Locale, MatrixVariant, OptionAxis } from "../types";

interface VariantSelectorProps {
  locale: Locale;
  axes: OptionAxis[];
  variants: MatrixVariant[];
  selection: Selection;
  onSelect(axis: string, value: string): void;
  /** Axes whose current value a later choice made impossible — kept, shown, and asked to be replaced (MDS §10.2). */
  invalidAxes: string[];
  /** Axes the customer tried to add to cart without choosing. */
  missingAxes: string[];
}

/**
 * §4.2 — explicit tiles (D-S2). Every value is always shown. A value that
 * cannot be had with the current choice on the other axes is struck through
 * with the reason; choosing it anyway keeps the now-impossible choice on the
 * other axis visible and asks for it to be replaced — the customer is never
 * silently switched. Only a value no variant can satisfy at all is disabled.
 */
export function VariantSelector({ locale, axes, variants, selection, onSelect, invalidAxes, missingAxes }: VariantSelectorProps) {
  const dict = getDictionary(locale);

  return (
    <div className="flex flex-col gap-6">
      {axes.map((axis) => {
        const chosen = axis.values.find((value) => value.value === selection[axis.key]);
        const isColour = axis.values.some((value) => value.swatch);
        const invalid = invalidAxes.includes(axis.key);
        const missing = missingAxes.includes(axis.key);
        const chosenState = chosen ? valueState(axis.key, chosen.value, selection, variants) : null;
        const reason =
          invalid && chosen && chosenState
            ? chosenState.state === "soldOut"
              ? dict.soldOutIn(t(chosen.label, locale))
              : dict.notMadeIn(otherLabels(axes, selection, axis.key, locale) || t(chosen.label, locale))
            : null;

        return (
          <fieldset key={axis.key} id={`axis-${axis.key}`} className="flex scroll-mt-28 flex-col gap-3" aria-describedby={reason || missing ? `${axis.key}-note` : undefined}>
            <legend className="mb-3 flex w-full items-baseline justify-between gap-3">
              <span className="text-[0.9375rem]">
                <span className="font-semibold">{t(axis.name, locale)}</span>
                {chosen ? <span className="text-ink-secondary"> · {t(chosen.label, locale)}</span> : null}
              </span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {axis.values.map((value) => {
                const state = valueState(axis.key, value.value, selection, variants);
                const neverAvailable = !variants.some((variant) => variant.purchasable && variant.optionValues.some((option) => option.key === axis.key && option.value === value.value));
                const selected = selection[axis.key] === value.value;
                const struck = state.state !== "available";
                const label = t(value.label, locale);
                return (
                  <button
                    key={value.value}
                    type="button"
                    aria-pressed={selected}
                    aria-disabled={neverAvailable || undefined}
                    aria-label={struck ? `${label} — ${state.state === "soldOut" ? dict.outOfStock : locale === "ar" ? "غير متوفر بهذا الاختيار" : "unavailable with this choice"}` : label}
                    onClick={() => !neverAvailable && onSelect(axis.key, value.value)}
                    className={cn(
                      "relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 border px-3 text-[0.9375rem] transition-[background-color,color,border-color,box-shadow] duration-[var(--sf-duration-fast)] ease-standard",
                      "rounded-[var(--sf-radius-control)]",
                      selected ? "border-ink bg-ink text-canvas shadow-[inset_0_0_0_2px_var(--sf-canvas)]" : "border-line-strong bg-surface text-ink hover:border-ink",
                      selected && invalid && "border-critical bg-surface text-ink shadow-[inset_0_0_0_2px_var(--sf-critical)]",
                      neverAvailable && "cursor-not-allowed text-ink-muted",
                      struck && "after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(to_top_right,transparent_calc(50%-0.5px),currentColor_calc(50%-0.5px),currentColor_calc(50%+0.5px),transparent_calc(50%+0.5px))] after:opacity-50"
                    )}
                  >
                    {isColour ? <span className="size-5 flex-none rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.15)]" style={{ background: value.swatch }} aria-hidden="true" /> : null}
                    <span className={cn(isColour ? "" : "tabular")}>{label}</span>
                  </button>
                );
              })}
            </div>
            {reason ? (
              <p id={`${axis.key}-note`} className="text-[0.875rem] font-medium text-critical" role="status">
                {reason} — {locale === "ar" ? "اختر غيره" : `choose another ${t(axis.name, locale).toLowerCase()}`}
              </p>
            ) : missing ? (
              <p id={`${axis.key}-note`} className="text-[0.875rem] font-medium text-critical" role="status">
                {dict.chooseOptions} {t(axis.name, locale)}
              </p>
            ) : null}
          </fieldset>
        );
      })}
    </div>
  );
}

/** The other axes' chosen labels, e.g. "Ink" — so "Not made in Ink" names what conflicts. */
function otherLabels(axes: OptionAxis[], selection: Selection, exceptAxis: string, locale: Locale): string {
  return axes
    .filter((axis) => axis.key !== exceptAxis && selection[axis.key])
    .map((axis) => t(axis.values.find((value) => value.value === selection[axis.key])?.label, locale))
    .join(" · ");
}
