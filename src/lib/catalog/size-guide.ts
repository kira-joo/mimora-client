import type { Locale } from "@/i18n/routing";
import type { Localized, SizeGuide } from "@/lib/api/types";
import { formatNumber, localized } from "@/lib/format/numerals";

/**
 * A size guide's chart is free-form on the backend (`chartData`). This reads
 * the one shape the backoffice writes — `{ headers, rows }`, headers either
 * plain strings or localized — and returns null for anything else, so a guide
 * that cannot be shown is not linked (no dead UI). Numeric cells follow the
 * page's numerals (D-10).
 */
export interface SizeTable {
  headers: string[];
  rows: string[][];
}

const NUMERIC = /^\d+(\.\d+)?$/;

function cell(value: unknown, locale: Locale): string {
  if (typeof value === "number") return formatNumber(locale, value);
  if (typeof value === "string") return NUMERIC.test(value) ? formatNumber(locale, Number(value)) : value;
  if (value && typeof value === "object" && "ar" in value && "en" in value) return localized(value as Localized, locale);
  return "";
}

export function sizeTable(guide: SizeGuide | null, locale: Locale): SizeTable | null {
  const chart = guide?.chartData as { headers?: unknown; rows?: unknown } | undefined;
  if (!chart || !Array.isArray(chart.headers) || !Array.isArray(chart.rows) || chart.rows.length === 0) return null;
  const headers = chart.headers.map((header) => cell(header, locale));
  const rows = chart.rows.filter(Array.isArray).map((row) => (row as unknown[]).map((value) => cell(value, locale)));
  return headers.every(Boolean) && rows.length ? { headers, rows } : null;
}
