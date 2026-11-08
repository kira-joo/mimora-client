"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionApi } from "@/lib/api/session-client";
import { SessionEndpoints } from "@/lib/api/session.endpoints";

export const sessionKeys = { me: ["session", "me"] as const };

/** Who is signed in; `null` is a guest — a normal state, never an error (MDS §7). */
export function useSession() {
  return useQuery({ queryKey: sessionKeys.me, queryFn: () => sessionApi().request(SessionEndpoints.me).then((r) => r.customer), staleTime: 60_000 });
}

/** Sign in or up. A guest cart is merged server-side on success (B-3), so everything is refetched. */
export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { phone: string; password: string }) => sessionApi().request(SessionEndpoints.login, { body }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

/** Logout is a request, not a local state change — the client cannot clear an httpOnly cookie (MDS §7). */
export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sessionApi().request(SessionEndpoints.logout, { skipAuthRefresh: true }),
    onSettled: () => {
      queryClient.removeQueries();
      queryClient.invalidateQueries();
    },
  });
}
