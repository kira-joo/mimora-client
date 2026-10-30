/*
 * The price-range selector's arithmetic — positions on a slider, never money.
 * A slider thumb resting on its track's end means "no bound on that side", so
 * the URL carries only a price the customer actually picked (whole numbers),
 * and the facet's own end values (which may have fractions) are never rounded
 * into a filter. Nothing here prices anything: it only turns a position into
 * the string a filter sends, exactly as a typed value would be.
 */

const MONEY = /^\d+(\.\d{1,2})?$/;

export interface SliderScale {
  min: number;
  max: number;
  step: number;
}

/** The slider's whole-number step for a span of prices: fine for a few hundred, coarser as the catalog widens. */
export function niceStep(span: number): number {
  if (span <= 100) return 1;
  if (span <= 500) return 5;
  if (span <= 2000) return 10;
  if (span <= 10000) return 50;
  return 100;
}

/** The slider's track for the catalog's price range (strings from the facets); `null` when there is no range to choose within. */
export function sliderScale(range: { min?: string; max?: string } | undefined): SliderScale | null {
  const lo = Number(range?.min);
  const hi = Number(range?.max);
  if (!range?.min || !range?.max || !Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return null;
  const step = niceStep(hi - lo);
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  return max > min ? { min, max, step } : null;
}

const clamp = (value: number, scale: SliderScale) => Math.min(scale.max, Math.max(scale.min, value));

/** Where a bound (the URL's string, or none) sits on the track. */
export function boundToPosition(bound: string | undefined, scale: SliderScale, edge: "min" | "max"): number {
  if (!bound || !MONEY.test(bound)) return edge === "min" ? scale.min : scale.max;
  return clamp(Number(bound), scale);
}

/** What a thumb's position means as a filter: the track's end is "no bound", anything else a whole-number price. */
export function positionToBound(position: number, scale: SliderScale, edge: "min" | "max"): string | undefined {
  if (edge === "min" ? position <= scale.min : position >= scale.max) return undefined;
  return String(Math.round(position));
}

/** Money string → minor units, so two bounds compare exactly (never as floats). `null` when it is not a price. */
function cents(value: string): number | null {
  if (!MONEY.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export type PriceProblem = "format" | "order" | null;

/** Whether the two bounds, as typed, can be sent: each a price (or empty), and the lowest not above the highest. */
export function priceProblem(min: string, max: string): PriceProblem {
  const lo = min ? cents(min) : 0;
  const hi = max ? cents(max) : Infinity;
  if (lo === null || hi === null) return "format";
  return lo > hi ? "order" : null;
}
