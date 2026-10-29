import type { MatrixVariant } from "@/lib/api/types";

/*
 * What the buy box says about a resolved variant (plan #20, #25). The words
 * must match what is true: a variant orderable only because the merchant sells
 * past zero is "available to order", never "in stock" — telling a customer
 * something is in stock when it ships later is how a backorder becomes a
 * dispute.
 */
export type StockStatus = "soldOut" | "availableToOrder" | "lowStock" | "inStock";

/**
 * Backorder outranks every other available state. Low stock is a signal only
 * LIVE data may raise (a cached "only a few left" is a stale claim), so it is
 * shown only when `isLive`.
 */
export function stockStatus(variant: Pick<MatrixVariant, "purchasable" | "lowStock" | "onBackorder">, isLive: boolean): StockStatus {
  if (!variant.purchasable) return "soldOut";
  if (variant.onBackorder) return "availableToOrder";
  if (isLive && variant.lowStock) return "lowStock";
  return "inStock";
}

export interface PackInfo {
  kind: "pack" | "box";
  /** Units one purchase carries. */
  units: number;
}

/**
 * "Pack of N" / "Box of N" for a variant sold as a multi-unit pack. `EACH` is
 * the unremarkable default and says nothing, and a "pack" of one unit is just
 * the item — neither earns a line.
 */
export function packInfo(variant: Pick<MatrixVariant, "unitOfMeasure" | "unitsPerSale">): PackInfo | null {
  if (!Number.isInteger(variant.unitsPerSale) || variant.unitsPerSale <= 1) return null;
  if (variant.unitOfMeasure === "PACK") return { kind: "pack", units: variant.unitsPerSale };
  if (variant.unitOfMeasure === "BOX") return { kind: "box", units: variant.unitsPerSale };
  return null;
}

/** The pack line to show before a selection resolves a variant: only when EVERY variant is sold the same way. */
export function sharedPackInfo(variants: Array<Pick<MatrixVariant, "unitOfMeasure" | "unitsPerSale">>): PackInfo | null {
  const first = variants[0] ? packInfo(variants[0]) : null;
  if (!first) return null;
  return variants.every((variant) => {
    const info = packInfo(variant);
    return info?.kind === first.kind && info.units === first.units;
  })
    ? first
    : null;
}
