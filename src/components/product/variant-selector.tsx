"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { axisValues, swatchOf, valueLabel } from "@/lib/catalog/option-labels";
import { valueState, type Selection } from "@/lib/catalog/variant-selection";
import { localized } from "@/lib/format/numerals";
import type { MatrixVariant, OptionAxis } from "@/lib/api/types";
import type { Locale } from "@/i18n/routing";

interface VariantSelectorProps {
  axes: OptionAxis[];
  variants: MatrixVariant[];
  selection: Selection;
  onSelect(axis: string, value: string): void;
  /** Axes whose current value a later choice made impossible — kept, shown, and asked to be replaced (MDS §10.2). */
  invalidAxes: string[];
  /** Axes the customer tried to add to cart without choosing. */
  missingAxes: string[];
  /** Distinguishes two selectors on one page (product page + Quick Add) for ids. */
  idPrefix?: string;
}

/**
 * design-system §4.2 — explicit tiles (D-S2). Every value is always shown —
 * hiding one makes the catalog look smaller than it is, and the disabled state
 * IS the information (MDS §10.1). A value that cannot be had with the current
 * choice on the other axes is struck through with the reason announced;
 * choosing it anyway keeps the now-impossible choice on the other axis visible
 * and asks for it to be replaced — the customer is never silently switched.
 * Only a value no purchasable variant carries at all is disabled. Real
 * <button>s with aria-pressed; colour is never the only carrier of state.
 */
export function VariantSelector({ axes, variants, selection, onSelect, invalidAxes, missingAxes, idPrefix = "axis" }: VariantSelectorProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");

  return (
    <div className="flex flex-col gap-6">
      {axes.map((axis) => {
        const chosen = selection[axis.key];
        const axisName = localized(axis.name, locale);
        const invalid = invalidAxes.includes(axis.key);
        const missing = missingAxes.includes(axis.key);
        const chosenState = chosen !== undefined ? valueState(axis.key, chosen, selection, variants) : null;
        const others = axes
          .filter((other) => other.key !== axis.key && selection[other.key] !== undefined)
          .map((other) => valueLabel(other, selection[other.key]!, locale))
          .join(" · ");
        const reason =
          invalid && chosen !== undefined && chosenState
            ? chosenState.state === "soldOut"
              ? t("soldOutIn", { value: valueLabel(axis, chosen, locale) })
              : t("notMadeIn", { value: others || valueLabel(axis, chosen, locale) })
            : null;
        const noteId = `${idPrefix}-${axis.key}-note`;

        return (
          <fieldset key={axis.key} id={`${idPrefix}-${axis.key}`} className="flex scroll-mt-28 flex-col gap-3" aria-describedby={reason || missing ? noteId : undefined}>
            <legend className="mb-3 flex w-full items-baseline justify-between gap-3">
              <span className="text-[0.9375rem]">
                <span className="font-semibold">{axisName}</span>
                {chosen !== undefined ? <span className="text-ink-secondary"> · {valueLabel(axis, chosen, locale)}</span> : null}
              </span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {axisValues(axis, variants).map((value) => {
                const state = valueState(axis.key, value, selection, variants);
                const neverAvailable = !variants.some((variant) => variant.purchasable && variant.optionValues.some((option) => option.key === axis.key && option.value === value));
                const selected = chosen === value;
                const struck = state.state !== "available";
                const label = valueLabel(axis, value, locale);
                const swatch = swatchOf(axis, value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    aria-disabled={neverAvailable || undefined}
                    aria-label={struck ? `${label} — ${state.state === "soldOut" ? t("outOfStock") : t("unavailableWithChoice")}` : label}
                    onClick={() => !neverAvailable && onSelect(axis.key, value)}
                    className={cn(
                      "relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[var(--sf-radius-control)] border px-3 text-[0.9375rem] transition-[background-color,color,border-color,box-shadow] duration-[var(--sf-duration-fast)] ease-standard",
                      selected ? "border-ink bg-ink text-canvas shadow-[inset_0_0_0_2px_var(--sf-canvas)]" : "border-line-strong bg-surface text-ink hover:border-ink",
                      selected && invalid && "border-critical bg-surface text-ink shadow-[inset_0_0_0_2px_var(--sf-critical)]",
                      neverAvailable && "cursor-not-allowed text-ink-muted",
                      struck && "after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(to_top_right,transparent_calc(50%-0.5px),currentColor_calc(50%-0.5px),currentColor_calc(50%+0.5px),transparent_calc(50%+0.5px))] after:opacity-50"
                    )}
                  >
                    {swatch ? <span className="size-5 flex-none rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.15)]" style={{ background: swatch }} aria-hidden="true" /> : null}
                    <span className={cn(swatch ? "" : "tabular")}>{label}</span>
                  </button>
                );
              })}
            </div>
            {reason ? (
              <p id={noteId} className="text-[0.875rem] font-medium text-critical" role="status">
                {reason} — {t("chooseAnother", { axis: axisName })}
              </p>
            ) : missing ? (
              <p id={noteId} className="text-[0.875rem] font-medium text-critical" role="status">
                {t("chooseOptions")} {axisName}
              </p>
            ) : null}
          </fieldset>
        );
      })}
    </div>
  );
}
