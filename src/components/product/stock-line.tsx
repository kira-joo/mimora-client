import { useTranslations } from "next-intl";
import type { StockStatus } from "@/lib/catalog/stock-status";

/** What the product page and Quick Add say about a resolved variant. "Available to order" is deliberately NOT green and never says "in stock": it ships later (plan #20). */
export function StockLine({ status }: { status: StockStatus }) {
  const t = useTranslations("common");
  if (status === "lowStock") return <span className="font-medium text-caution">{t("lowStock")}</span>;
  if (status === "availableToOrder") return <span className="font-medium text-ink">{t("availableToOrder")}</span>;
  if (status === "soldOut") return <span className="font-medium text-critical">{t("outOfStock")}</span>;
  return <span className="text-positive">{t("inStock")}</span>;
}
