import type { Quote } from "@/lib/api/types";

/**
 * What to tell the customer about the code they entered. The backend applies at most ONE promotion —
 * the best of the entered code and the store's automatic ones — so a valid code can lose to a better
 * automatic offer; saying "applied" then would promise a discount the order does not carry.
 */
export function promotionStatus(applied: string | undefined, promotion: Quote["promotion"]): "applied" | "superseded" | "notApplicable" | null {
  if (!applied) return null;
  if (promotion && !promotion.automatic && promotion.code?.toUpperCase() === applied.toUpperCase()) return "applied";
  if (promotion?.automatic) return "superseded";
  return "notApplicable";
}
