"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionApi } from "@/lib/api/session-client";
import { SessionEndpoints } from "@/lib/api/session.endpoints";
import type { Address } from "@/lib/api/types";
import { sessionKeys, useSession } from "@/lib/session/use-session";
import { nextOffset, ORDERS_PAGE_SIZE } from "./account-model";

/*
 * Account reads and writes. Every query waits for a session (`enabled`) — a
 * guest never fires a request that can only 401. Lists that are edited
 * (addresses) update optimistically only where the outcome is certain
 * (delete); everything else refetches from the server's answer.
 */
const useSignedIn = () => Boolean(useSession().data);

export function useOrders() {
  const enabled = useSignedIn();
  return useInfiniteQuery({
    queryKey: ["account", "orders"],
    queryFn: ({ pageParam }) => sessionApi().request(SessionEndpoints.orders, { query: { limit: ORDERS_PAGE_SIZE, offset: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => nextOffset(last.length, ORDERS_PAGE_SIZE, pages.reduce((sum, page) => sum + page.length, 0)),
    enabled,
    staleTime: 15_000,
  });
}

export const addressesKey = ["account", "addresses"] as const;

export function useAddresses() {
  const enabled = useSignedIn();
  return useQuery({ queryKey: addressesKey, queryFn: () => sessionApi().request(SessionEndpoints.addresses), enabled, staleTime: 15_000 });
}

type AddressBody = Omit<Address, "_id" | "isDefault"> & { isDefault?: boolean };

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddressBody) => sessionApi().request(SessionEndpoints.createAddress, { body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressesKey }),
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Omit<Address, "_id">> }) => sessionApi().request(SessionEndpoints.updateAddress, { params: { id }, body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressesKey }),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sessionApi().request(SessionEndpoints.deleteAddress, { params: { id } }),
    // Optimistic: the row leaves at once; a refusal restores the server's list.
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: addressesKey });
      const previous = queryClient.getQueryData<{ addresses: Address[]; total: number }>(addressesKey);
      if (previous) queryClient.setQueryData(addressesKey, { addresses: previous.addresses.filter((a) => a._id !== id), total: previous.total - 1 });
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(addressesKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: addressesKey }),
  });
}

export function useReturns() {
  const enabled = useSignedIn();
  return useQuery({ queryKey: ["account", "returns"], queryFn: () => sessionApi().request(SessionEndpoints.returns), enabled, staleTime: 15_000 });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; email?: string }) => sessionApi().request(SessionEndpoints.updateProfile, { body }),
    onSuccess: (customer) => queryClient.setQueryData(sessionKeys.me, customer),
  });
}

/** The backend ends the session on success; the caller shows the "signed out" screen and then calls `endSessionLocally`. */
export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { oldPassword: string; newPassword: string }) => sessionApi().request(SessionEndpoints.changePassword, { body, skipAuthRefresh: true }),
  });
}

/** Forget everything cached for the customer once the server has revoked their session. */
export function useEndSessionLocally() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.removeQueries();
    queryClient.setQueryData(sessionKeys.me, null);
  };
}

/** Reviews are an upsert per customer and product (backend D-2), so a repeated submit is already safe. */
export function useSubmitReview() {
  return useMutation({
    mutationFn: (body: { productId: string; rating: number; title: string; body: string }) => sessionApi().request(SessionEndpoints.createReview, { body }),
  });
}
