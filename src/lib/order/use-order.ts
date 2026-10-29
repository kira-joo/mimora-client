"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { newIdempotencyKey, sessionApi } from "@/lib/api/session-client";
import { SessionEndpoints } from "@/lib/api/session.endpoints";

/*
 * One order, live. A guest reaches it with the order's access token (the
 * tracking link, D-9); a customer by their session. The token travels to this
 * origin as a request header — the BFF forwards it as `x-order-access-token`.
 * Polled while the tab is open (MDS §14 — tracking is polled, not pushed).
 */
const tokenHeaders = (token?: string) => (token ? { "x-order-access-token": token } : undefined);
export const orderKey = (orderNumber: string) => ["order", orderNumber] as const;

export function useOrder(orderNumber: string, token?: string) {
  return useQuery({
    queryKey: orderKey(orderNumber),
    queryFn: () => sessionApi().request(SessionEndpoints.order, { params: { orderNumber }, headers: tokenHeaders(token) }),
    refetchInterval: 60_000,
    retry: false,
  });
}

/** The order's invoice — same access rule as the order: the owner's session, or the guest's token. Not polled: an invoice does not change. */
export function useInvoice(orderNumber: string, token?: string) {
  return useQuery({
    queryKey: ["invoice", orderNumber] as const,
    queryFn: () => sessionApi().request(SessionEndpoints.orderInvoice, { params: { orderNumber }, headers: tokenHeaders(token) }),
    retry: false,
    staleTime: 60_000,
  });
}

export function useCancelOrder(orderNumber: string, token?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => sessionApi().request(SessionEndpoints.cancelOrder, { params: { orderNumber }, body: reason ? { reason } : {}, headers: tokenHeaders(token) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: orderKey(orderNumber) }),
  });
}

/** Proof of a transfer: multipart, one Idempotency-Key per chosen file (a retried upload of the same file replays). */
export function useUploadProof(orderNumber: string, token?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, key }: { file: File; key: string }) => {
      const body = new FormData();
      body.set("proof", file, file.name);
      return sessionApi().request(SessionEndpoints.paymentProof, { params: { orderNumber }, body, headers: { "Idempotency-Key": key, ...tokenHeaders(token) } });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: orderKey(orderNumber) }),
  });
}

export { newIdempotencyKey };
