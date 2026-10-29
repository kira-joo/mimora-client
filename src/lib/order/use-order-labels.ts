"use client";

import { useTranslations } from "next-intl";
import type { OrderStatus } from "@/lib/api/types";

/**
 * The customer-facing wording for an order status, one function for every surface that shows one (the order page,
 * the progress bar, the account list). The long-standing statuses are in `common`; the later ones — in transit,
 * collected — are under `common.orderDocs`, so this looks there first and falls back to `common`.
 */
export function useStatusLabel(): (status: OrderStatus) => string {
  const t = useTranslations("common");
  const td = useTranslations("common.orderDocs");
  return (status) => {
    const docsKey = `status_${status}` as Parameters<typeof td>[0];
    return td.has(docsKey) ? td(docsKey) : t(`status_${status}` as Parameters<typeof t>[0]);
  };
}
