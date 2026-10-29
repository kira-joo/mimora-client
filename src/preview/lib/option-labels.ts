import { t } from "../format";
import type { Locale, MatrixVariant, Product } from "../types";

/** The selected option labels as shown — "Olive · M" (MDS §6.5: lines show the selected option labels). */
export function optionLabels(product: Product, variant: MatrixVariant, locale: Locale): string {
  return product.optionAxes
    .map((axis) => {
      const value = variant.optionValues.find((option) => option.key === axis.key)?.value;
      return t(axis.values.find((candidate) => candidate.value === value)?.label, locale);
    })
    .filter(Boolean)
    .join(" · ");
}
