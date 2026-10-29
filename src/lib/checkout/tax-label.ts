import type { FulfilmentSettings } from "@/lib/api/types";

/*
 * How tax is LABELLED on cart, checkout and order summaries (plan #29). The
 * amount is always the server's (non-negotiable 3) — this decides only what to
 * call it, and whether to show it at all:
 *
 *   ADDED     → a "Tax" row: a line the total is the sum of.
 *   INCLUDED  → "Includes tax X": the prices already contain it, so it is NOT a
 *               row to add, and an additive row would read as a surcharge.
 *   unknown   → no tax line. Settings that failed to load must not be guessed
 *               into INCLUDED (the old behaviour) — saying "tax included" about
 *               a store whose mode is unknown is a claim nothing backs.
 */
export type TaxMode = FulfilmentSettings["tax"]["mode"];

/** The configured mode, or null when settings are missing or carry something unrecognised. */
export function taxModeOf(settings: { tax?: { mode?: string } } | null | undefined): TaxMode | null {
  const mode = settings?.tax?.mode;
  return mode === "INCLUDED" || mode === "ADDED" ? mode : null;
}

export type TaxLine = { kind: "none" } | { kind: "added"; amount: string } | { kind: "included"; amount: string };

/** A presence check on a money string — not arithmetic. */
const isZero = (amount: string | undefined) => !amount || !/[1-9]/.test(amount);

export function taxLine(mode: TaxMode | null | undefined, tax: string | undefined): TaxLine {
  if (!mode || !tax || isZero(tax)) return { kind: "none" };
  return mode === "ADDED" ? { kind: "added", amount: tax } : { kind: "included", amount: tax };
}
