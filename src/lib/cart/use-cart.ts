"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionApi } from "@/lib/api/session-client";
import { SessionEndpoints, type FulfilmentDraft } from "@/lib/api/session.endpoints";
import type { CartView } from "@/lib/api/types";

/*
 * The cart is server state. Every mutation answers with the whole cart, which
 * replaces the cached one; the quote (prices, totals, availability) is a
 * separate, always-fresh query keyed off it — totals are never stored, always
 * re-quoted (MDS §11). Line identity is server-issued and opaque: this app
 * never constructs a lineId.
 */
export const cartKeys = { cart: ["cart"] as const, quote: ["cart", "quote"] as const };

export function useCart() {
  return useQuery({ queryKey: cartKeys.cart, queryFn: () => sessionApi().request(SessionEndpoints.cart), staleTime: 0 });
}

/** Total units in the cart, for the header badge. */
export function cartCount(cart: CartView | undefined): number {
  return cart?.lines.reduce((total, line) => total + line.quantity, 0) ?? 0;
}

function useCartMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<CartView>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKeys.cart, cart);
      queryClient.invalidateQueries({ queryKey: cartKeys.quote });
    },
  });
}

/** Add a variant. The server re-validates regardless of what the matrix said (MDS §10.3). */
export function useAddToCart() {
  return useCartMutation((body: { variantId: string; quantity: number }) => sessionApi().request(SessionEndpoints.addLine, { body }));
}

/**
 * Quantity changes and removals are optimistic with a rollback on failure
 * (MDS §11): the stepper answers the tap at once, and a refusal restores the
 * server's cart rather than leaving a number the server never agreed to.
 */
export function useUpdateLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId, quantity }: { lineId: string; quantity: number }) => sessionApi().request(SessionEndpoints.updateLine, { params: { lineId }, body: { quantity } }),
    onMutate: async ({ lineId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: cartKeys.cart });
      const previous = queryClient.getQueryData<CartView>(cartKeys.cart);
      if (previous) queryClient.setQueryData<CartView>(cartKeys.cart, { ...previous, lines: previous.lines.map((line) => (line.lineId === lineId ? { ...line, quantity } : line)) });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(cartKeys.cart, context.previous);
    },
    onSuccess: (cart) => queryClient.setQueryData(cartKeys.cart, cart),
    onSettled: () => queryClient.invalidateQueries({ queryKey: cartKeys.quote }),
  });
}

export function useRemoveLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId }: { lineId: string }) => sessionApi().request(SessionEndpoints.removeLine, { params: { lineId } }),
    onMutate: async ({ lineId }) => {
      await queryClient.cancelQueries({ queryKey: cartKeys.cart });
      const previous = queryClient.getQueryData<CartView>(cartKeys.cart);
      if (previous) queryClient.setQueryData<CartView>(cartKeys.cart, { ...previous, lines: previous.lines.filter((line) => line.lineId !== lineId) });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(cartKeys.cart, context.previous);
    },
    onSuccess: (cart) => queryClient.setQueryData(cartKeys.cart, cart),
    onSettled: () => queryClient.invalidateQueries({ queryKey: cartKeys.quote }),
  });
}

export function useSetFulfilment() {
  return useCartMutation((body: FulfilmentDraft) => sessionApi().request(SessionEndpoints.setFulfilment, { body }));
}

export function useApplyPromotion() {
  return useCartMutation((code: string) => sessionApi().request(SessionEndpoints.applyPromotion, { body: { code } }));
}

export function useRemovePromotion() {
  return useCartMutation(() => sessionApi().request(SessionEndpoints.removePromotion));
}

/** The authoritative prices — the only numbers this app shows for a cart (MDS §12). Never cached beyond the cart it describes. */
export function useQuote(enabled: boolean) {
  return useQuery({ queryKey: cartKeys.quote, queryFn: () => sessionApi().request(SessionEndpoints.quote), enabled, staleTime: 0, retry: false });
}
