"use client";

import { useTranslations } from "next-intl";
import { reviewableProducts } from "@/lib/account/account-model";
import { useOrder } from "@/lib/order/use-order";
import { ReviewForm } from "./review-form";
import { isCompletedStatus } from "@/lib/order/order-progress";

/**
 * Per-product review actions under an account order. Offered only for a
 * completed order — delivered, or collected for a pickup (MDS §10: reviews require a verified purchase — for anyone
 * else the control is absent, not disabled), one per product, named by the
 * `productId` the order line carries.
 */
export function OrderReviews({ orderNumber }: { orderNumber: string }) {
  const t = useTranslations("common");
  const order = useOrder(orderNumber);
  // Completed means delivered, or collected for a pickup.
  if (!order.data || !isCompletedStatus(order.data.status)) return null;
  const products = reviewableProducts(order.data.lines);
  if (!products.length) return null;
  return (
    <section className="container-sf flex flex-col gap-5 pb-12">
      <h2 className="t-heading">{t("reviewItemsTitle")}</h2>
      <ul className="flex flex-col gap-6">
        {products.map((product) => (
          <li key={product.productId} className="flex flex-col gap-3 border-t border-line pt-4">
            <p className="font-medium">{product.productName}</p>
            <ReviewForm productId={product.productId} productName={product.productName} />
          </li>
        ))}
      </ul>
    </section>
  );
}
