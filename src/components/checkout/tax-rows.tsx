import { useTranslations } from "next-intl";
import type { TaxLine } from "@/lib/checkout/tax-label";

/*
 * How a summary shows tax (lib/checkout/tax-label.ts decides which):
 *   ADDED     → `TaxAddedRow`, a "Tax" row inside the summary's <dl>, because
 *               the total really is the lines plus it;
 *   INCLUDED  → `TaxIncludesNote`, "Includes tax X" BELOW the figures — the
 *               prices already contain it, so it is not a row anyone adds up.
 * Unknown mode or zero tax renders neither. The amount is always the server's.
 */
export function TaxAddedRow({ line, price, className = "" }: { line: TaxLine; price(amount: string): string; className?: string }) {
  const t = useTranslations("common");
  if (line.kind !== "added") return null;
  return (
    <div className={`flex justify-between ${className}`}>
      <dt className="text-ink-secondary">{t("tax")}</dt>
      <dd className="tabular">{price(line.amount)}</dd>
    </div>
  );
}

export function TaxIncludesNote({ line, price, className = "" }: { line: TaxLine; price(amount: string): string; className?: string }) {
  const t = useTranslations("common");
  if (line.kind !== "included") return null;
  return <p className={`text-[0.8125rem] text-ink-muted ${className}`}>{t("taxIncludesAmount", { amount: price(line.amount) })}</p>;
}
