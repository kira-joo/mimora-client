"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionApi } from "@/lib/api/session-client";
import { SessionEndpoints } from "@/lib/api/session.endpoints";
import type { WishlistItem } from "@/lib/api/types";
import { useSession } from "@/lib/session/use-session";

/*
 * The wishlist is an account feature on the backend (`/api/shop/wishlist`,
 * requireCustomer). A guest's heart therefore leads to sign-in and back
 * (wishlist-button.tsx) — never a local toggle that silently saves nothing.
 */
export const wishlistKey = ["wishlist"] as const;

export function useWishlist() {
  const { data: customer } = useSession();
  return useQuery({
    queryKey: wishlistKey,
    queryFn: () => sessionApi().request(SessionEndpoints.wishlist, { query: { limit: 100 } }),
    enabled: Boolean(customer),
    staleTime: 30_000,
  });
}

export function useWishlistToggle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, saved }: { productId: string; saved: boolean }): Promise<void> => {
      if (saved) await sessionApi().request(SessionEndpoints.removeFromWishlist, { params: { productId } });
      else await sessionApi().request(SessionEndpoints.addToWishlist, { body: { productId } });
    },
    // Optimistic: the heart answers the tap at once; a refusal restores the server's list.
    onMutate: async ({ productId, saved }) => {
      await queryClient.cancelQueries({ queryKey: wishlistKey });
      const previous = queryClient.getQueryData<{ items: WishlistItem[]; total: number }>(wishlistKey);
      if (previous) {
        const items = saved ? previous.items.filter((item) => item.productId !== productId) : [...previous.items, { _id: `pending-${productId}`, productId, productSlug: "", productName: { ar: "", en: "" }, addedAt: new Date().toISOString() }];
        queryClient.setQueryData(wishlistKey, { items, total: items.length });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(wishlistKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: wishlistKey }),
  });
}
