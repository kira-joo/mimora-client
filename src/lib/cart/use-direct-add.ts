"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { catalogApi } from "@/lib/api/session-client";
import { CatalogEndpoints } from "@/lib/api/session.endpoints";
import { addToCart as addToCartEvent } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import type { CardProduct } from "@/lib/catalog/card-model";
import { MOTION } from "@/lib/motion/tokens";
import { useCartUi } from "./cart-ui";
import { useAddToCart } from "./use-cart";

/**
 * Add a product with no choice to make: the one purchasable variant, taken from
 * LIVE availability (never the cached card), through the same cart mutation the
 * product page uses. The server re-validates regardless (MDS §10.3). Shared by
 * every card that offers a direct "Add to cart" so there is one add path.
 */
export function useDirectAdd(product: CardProduct) {
  const queryClient = useQueryClient();
  const addToCart = useAddToCart();
  const { announceAdded } = useCartUi();
  const [justAdded, setJustAdded] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const busy = addToCart.isPending;

  async function add() {
    if (busy) return;
    setFailed(false);
    try {
      const variants = await queryClient.fetchQuery({ queryKey: ["availability", product.slug], queryFn: () => catalogApi().request(CatalogEndpoints.availability, { params: { slug: product.slug } }).then((response) => response.variants), staleTime: 0 });
      const variant = variants.find((candidate) => candidate.purchasable);
      if (!variant) throw new Error("sold out");
      await addToCart.mutateAsync({ variantId: variant.variantId, quantity: 1 });
      track(addToCartEvent({ productId: product.id, variantId: variant.variantId, quantity: 1 }));
      announceAdded({ productSlug: product.slug, productName: product.name, optionLabel: "", image: product.images[0] ? { provider: "", publicId: "", secureUrl: product.images[0].src } : null, price: variant.price });
      setJustAdded(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setJustAdded(false), MOTION.confirm * 1000);
    } catch {
      setFailed(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setFailed(false), MOTION.notice * 1000);
    }
  }

  return { add, busy, justAdded, failed };
}
