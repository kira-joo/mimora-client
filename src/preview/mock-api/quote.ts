import { sum, toMoney } from "@kira-joo/toolkit-common";
import { findProduct, store } from "../fixtures/catalog";
import type { MatrixVariant, Product } from "../types";

/*
 * STANDS IN FOR THE SERVER. The production storefront never computes a
 * price, fee, tax, discount or total (CLAUDE.md non-negotiable 3) — it calls
 * POST /api/shop/quote through its own route handler and renders the answer.
 * The preview has no backend, so this module plays that role, on Decimal
 * through the toolkit, and nothing outside `mock-api/` does any arithmetic.
 */

export interface PreviewCartLine {
  lineId: string;
  productSlug: string;
  variantId: string;
  quantity: number;
}

export interface QuotedLine {
  line: PreviewCartLine;
  product: Product;
  variant: MatrixVariant;
  unitPrice: string;
  lineTotal: string;
}

export interface Quote {
  lines: QuotedLine[];
  /** Lines whose variant can no longer be bought — surfaced explicitly, never silently dropped, and not totalled (MDS §11). */
  unavailable: QuotedLine[];
  itemCount: number;
  subtotal: string;
  delivery: string | null;
  total: string;
}

export function quote(lines: PreviewCartLine[], fulfilment: "delivery" | "pickup" | null): Quote {
  const quoted = lines.flatMap((line): QuotedLine[] => {
    const product = findProduct(line.productSlug);
    const variant = product?.variants.find((candidate) => candidate.variantId === line.variantId);
    if (!product || !variant) return [];
    return [{ line, product, variant, unitPrice: variant.price, lineTotal: toMoney(variant.price).mul(line.quantity).toFixed(2) }];
  });

  const purchasable = quoted.filter((line) => line.variant.purchasable);
  const subtotal = sum(purchasable.map((line) => toMoney(line.lineTotal)));
  const delivery = fulfilment === "delivery" ? toMoney(store.deliveryFee) : fulfilment === "pickup" ? toMoney("0") : null;
  return {
    lines: purchasable,
    unavailable: quoted.filter((line) => !line.variant.purchasable),
    itemCount: purchasable.reduce((count, line) => count + line.line.quantity, 0),
    subtotal: subtotal.toFixed(2),
    delivery: delivery ? delivery.toFixed(2) : null,
    total: (delivery ? subtotal.plus(delivery) : subtotal).toFixed(2),
  };
}
