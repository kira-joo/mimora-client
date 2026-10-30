import type { MatrixVariant } from "@/lib/api/types";

/*
 * Client-side variant selection over the compact matrix (MDS §10). Same
 * semantics as the backend's `resolveSelectableValues`/`resolveExactVariant`
 * (mimora-staff engines/variant-matrix): availability is existential —
 * a value is selectable iff at least one PURCHASABLE variant carries it AND
 * matches every other current selection. Never per-axis conjunction.
 *
 * Added for the design (§4.2): WHY a value is unavailable, because the two
 * reasons differ for the customer — "not made" (no variant exists for that
 * combination; permanent) versus "sold out" (it exists, can't be bought now).
 */

export type Selection = Record<string, string>;

export type ValueState = { state: "available" } | { state: "notMade" } | { state: "soldOut" };

const matches = (variant: MatrixVariant, selection: Selection, exceptAxis?: string) =>
  Object.entries(selection).every(([key, value]) => key === exceptAxis || variant.optionValues.some((option) => option.key === key && option.value === value));

const carries = (variant: MatrixVariant, axis: string, value: string) => variant.optionValues.some((option) => option.key === axis && option.value === value);

/** The state of one value on one axis, given the selection on every OTHER axis. */
export function valueState(axis: string, value: string, selection: Selection, variants: MatrixVariant[]): ValueState {
  const candidates = variants.filter((variant) => carries(variant, axis, value) && matches(variant, selection, axis));
  if (candidates.some((variant) => variant.purchasable)) return { state: "available" };
  return candidates.length > 0 ? { state: "soldOut" } : { state: "notMade" };
}

/** The purchasable variant for a COMPLETE selection; undefined while incomplete or when the combination can't be bought. */
export function exactVariant(selection: Selection, axisKeys: string[], variants: MatrixVariant[]): MatrixVariant | undefined {
  if (!axisKeys.every((key) => selection[key] !== undefined)) return undefined;
  return variants.find((variant) => variant.purchasable && matches(variant, selection) && variant.optionValues.length === axisKeys.length);
}

/**
 * Axes whose CURRENT value a later choice has made impossible. The rule
 * (MDS §10.2): such a value is retained visibly as unavailable and must be
 * replaced — the customer is never silently switched to another variant.
 */
export function invalidatedAxes(selection: Selection, variants: MatrixVariant[]): string[] {
  return Object.entries(selection)
    .filter(([axis, value]) => valueState(axis, value, selection, variants).state !== "available")
    .map(([axis]) => axis);
}

/** Price range over purchasable variants (or all, if none is) — shown until the selection resolves one variant. */
export function priceRange(variants: MatrixVariant[]): { min: string; max: string } {
  const pool = variants.some((variant) => variant.purchasable) ? variants.filter((variant) => variant.purchasable) : variants;
  // Decimal strings compared numerically for ORDER only — no arithmetic is done on money.
  const sorted = [...pool].sort((a, b) => Number(a.price) - Number(b.price));
  return { min: sorted[0]?.price ?? "0", max: sorted[sorted.length - 1]?.price ?? "0" };
}
