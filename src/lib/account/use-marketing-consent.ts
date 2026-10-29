"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { sessionApi } from "@/lib/api/session-client";
import { SessionPrivacyEndpoints } from "@/lib/api/privacy.endpoints";
import type { CustomerProfile } from "@/lib/api/types";
import { sessionKeys } from "@/lib/session/use-session";

/**
 * Grants or withdraws the signed-in customer's marketing consent — the one control
 * (legal-and-consent.md §4), effective the moment the server answers. Not optimistic
 * on purpose: a switch that shows "off" before the server has stopped the messages
 * would be telling the customer something that is not yet true. The server's answer
 * becomes the cached state.
 */
export function useSetMarketingConsent() {
  const queryClient = useQueryClient();
  const locale = useLocale() === "en" ? "en" : "ar";
  return useMutation({
    mutationFn: (granted: boolean) => sessionApi().request(SessionPrivacyEndpoints.marketingConsent, { body: { granted, source: "account", locale } }),
    onSuccess: (consent) => queryClient.setQueryData<CustomerProfile | null>(sessionKeys.me, (current) => (current ? { ...current, marketingConsent: consent } : current)),
  });
}
