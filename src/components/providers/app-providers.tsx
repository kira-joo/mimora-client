"use client";

import { useState, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { clearAuthenticatedQueries, createToolkitQueryClient } from "@kira-joo/frontend-toolkit-core/server";
import { setSessionEndedHandler } from "@/lib/api/session-client";
import { CartUiProvider } from "@/lib/cart/cart-ui";
import { StoreProvider } from "./store-context";

interface AppProvidersProps {
  store: Parameters<typeof StoreProvider>[0]["value"];
  children: ReactNode;
}

/**
 * Client providers for the whole storefront.
 *
 * - React Query via the toolkit's client (one retry for queries, none for
 *   mutations, never on a 4xx that a retry cannot fix).
 * - When the session cannot be renewed, authenticated data is dropped and the
 *   visitor continues as a guest — never redirected: guests are first-class.
 * - `reducedMotion="user"`: Motion drops transforms for visitors who ask for
 *   less motion — a genuine non-animated path (MDS §23).
 */
export function AppProviders({ store, children }: AppProvidersProps) {
  const [queryClient] = useState(() => {
    const client = createToolkitQueryClient();
    setSessionEndedHandler(() => clearAuthenticatedQueries(client));
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider value={store}>
        <MotionConfig reducedMotion="user">
          <CartUiProvider>{children}</CartUiProvider>
        </MotionConfig>
      </StoreProvider>
    </QueryClientProvider>
  );
}
