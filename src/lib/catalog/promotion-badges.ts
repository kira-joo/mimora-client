import "server-only";
import { getTranslations } from "next-intl/server";
import { getActivePromotions, orNull } from "./reads";
import { toPromotionBadges, type PromotionBadge } from "./promotions";
import { formatPrice } from "@/lib/format/numerals";
import type { Locale } from "@/i18n/routing";

/**
 * The store's automatic promotions as badges in this page's locale — read once
 * per render (`getActivePromotions` is deduped and tagged `PROMOTIONS`). D-15: a
 * failed read means no badges, logged; a promotion is decoration and never
 * blocks a page.
 */
export async function loadPromotionBadges(locale: Locale, currency: string): Promise<PromotionBadge[]> {
  const [promotions, t] = await Promise.all([orNull(getActivePromotions, "active promotions"), getTranslations({ locale, namespace: "common" })]);
  return toPromotionBadges(promotions ?? [], locale, (amount) => t("promoMinSpend", { amount: formatPrice(locale, amount, currency) }));
}
