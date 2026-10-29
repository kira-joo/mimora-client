import { Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProductPromotion } from "@/lib/catalog/promotions";

/**
 * The automatic promotion a product falls under: its NAME, and its condition
 * when it has one ("On orders over …"). Words only — what the discount is worth
 * is the cart's quote, never computed or implied here. The leading "Offer" is
 * read by a screen reader and hidden visually, so the icon and the text are not
 * the only signal and colour alone carries nothing.
 */
export function PromotionNote({ promotion, size = "card" }: { promotion: ProductPromotion; size?: "card" | "page" }) {
  const t = useTranslations("common");
  return (
    <p className={size === "page" ? "flex items-start gap-2 text-[0.9375rem] text-action" : "flex items-start gap-1.5 text-[0.8125rem] leading-snug text-action"}>
      <Tag className={size === "page" ? "mt-0.5 size-4 flex-none" : "mt-0.5 size-3.5 flex-none"} aria-hidden="true" />
      <span className="min-w-0">
        <span className="sr-only">{t("offer")}: </span>
        <span className="font-medium">{promotion.name}</span>
        {promotion.condition ? <span className="block text-ink-secondary">{promotion.condition}</span> : null}
      </span>
    </p>
  );
}
