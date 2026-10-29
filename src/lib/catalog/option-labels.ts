import type { Locale } from "@/i18n/routing";
import type { MatrixVariant, OptionAxis } from "@/lib/api/types";
import { localized } from "@/lib/format/numerals";

/** A value's label as the merchant wrote it; the value key itself when they wrote none (sizes like "M" need none). */
export function valueLabel(axis: OptionAxis, valueKey: string, locale: Locale): string {
  const label = axis.values?.find((value) => value.key === valueKey)?.label;
  return (label && localized(label, locale)) || valueKey;
}

/** Every value an axis can take, in the merchant's order where labelled, else first-seen order across the matrix. */
export function axisValues(axis: OptionAxis, variants: MatrixVariant[]): string[] {
  const seen = new Set<string>();
  for (const value of axis.values ?? []) seen.add(value.key);
  for (const variant of variants) {
    const value = variant.optionValues.find((option) => option.key === axis.key)?.value;
    if (value !== undefined) seen.add(value);
  }
  return [...seen];
}

export function swatchOf(axis: OptionAxis, valueKey: string): string | undefined {
  const swatch = axis.values?.find((value) => value.key === valueKey)?.swatch;
  return swatch && /^#[0-9a-f]{6}$/i.test(swatch) ? swatch : undefined;
}

/** The chosen options as shown — "Olive · M" (MDS §6.5). */
export function optionLabel(axes: OptionAxis[], variant: MatrixVariant, locale: Locale): string {
  return axes
    .map((axis) => {
      const value = variant.optionValues.find((option) => option.key === axis.key)?.value;
      return value === undefined ? "" : valueLabel(axis, value, locale);
    })
    .filter(Boolean)
    .join(" · ");
}
