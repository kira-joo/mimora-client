import type { Locale } from "@/i18n/routing";
import type { ActivePromotion } from "@/lib/api/types";
import { localized } from "@/lib/format/numerals";

/*
 * Automatic-promotion badges (plan #28). DISPLAY ONLY: this module resolves
 * which configured promotion a product falls under and what to SAY about it —
 * its name, and its minimum-spend condition. It never turns a promotion into a
 * price: the discount a customer actually gets is the server's quote and
 * nothing else (non-negotiable 3), so there is deliberately no "percent off"
 * arithmetic and no discounted price here.
 */
export interface PromotionBadge {
  id: string;
  name: string;
  /** "On orders over …" — present only when the promotion has a minimum spend. */
  condition?: string;
  scope: ActivePromotion["scope"];
}

/** What a product card or the product page shows. */
export interface ProductPromotion {
  name: string;
  condition?: string;
}

/** True when a money string has any non-zero digit — a presence check, not arithmetic. */
const hasAmount = (amount: string | undefined): amount is string => Boolean(amount && /[1-9]/.test(amount));

/**
 * Resolve the wire promotions into badges in the page's locale. A promotion
 * with no name in either locale has nothing to say and is dropped.
 * `minSpendText` words the condition (and formats the amount) — passed in so
 * this stays free of i18n and currency.
 */
export function toPromotionBadges(promotions: ActivePromotion[], locale: Locale, minSpendText: (amount: string) => string): PromotionBadge[] {
  return promotions.flatMap((promotion) => {
    const name = localized(promotion.name, locale).trim();
    if (!name) return [];
    return [{ id: promotion._id, name, condition: hasAmount(promotion.minSubtotal) ? minSpendText(promotion.minSubtotal) : undefined, scope: promotion.scope }];
  });
}

export interface PromotionTarget {
  productId: string;
  categoryId?: string;
  collectionIds?: string[];
}

/**
 * Whether the promotion reaches this product — the pricing engine's own rule:
 * any one of category, collection or product is enough, and no scope at all
 * means the whole catalogue. A promotion whose only target is specific
 * VARIANTS cannot be resolved from a product card, so it earns no badge (a
 * false promise is worse than a missing one).
 */
export function promotionReaches(scope: PromotionBadge["scope"], target: PromotionTarget): boolean {
  if (scope.all) return true;
  const productScoped = scope.productIds.includes(target.productId);
  const categoryScoped = Boolean(target.categoryId && scope.categoryIds.includes(target.categoryId));
  const collectionScoped = (target.collectionIds ?? []).some((id) => scope.collectionIds.includes(id));
  return productScoped || categoryScoped || collectionScoped;
}

/**
 * The promotion to show for one product, or null. A promotion aimed at this
 * product's own category/collection/product outranks one for the whole store
 * (it is the more specific, more useful thing to say); ties keep the API's order.
 */
export function promotionFor(badges: PromotionBadge[], target: PromotionTarget): ProductPromotion | null {
  const reaching = badges.filter((badge) => promotionReaches(badge.scope, target));
  const chosen = reaching.find((badge) => !badge.scope.all) ?? reaching[0];
  return chosen ? { name: chosen.name, ...(chosen.condition ? { condition: chosen.condition } : {}) } : null;
}
