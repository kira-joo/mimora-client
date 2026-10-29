"use client";

import { useEffect, useRef } from "react";
import { search, viewItemList } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

/**
 * Listing analytics, from the listing's own server-rendered result: which list was shown
 * (ids only, capped) and, for a search, that one happened and how many results it had
 * (the term is sanitised — see `searchTerm`). Fires once per distinct result, not per
 * re-render. Renders nothing.
 */
export function ListingAnalytics({ listId, productIds, searchQuery, resultCount }: { listId: string; productIds: string[]; searchQuery?: string; resultCount: number }) {
  const sent = useRef<string | null>(null);
  const signature = `${listId}|${searchQuery ?? ""}|${productIds.join(",")}`;
  useEffect(() => {
    if (sent.current === signature) return;
    sent.current = signature;
    if (searchQuery) track(search(searchQuery, resultCount));
    if (productIds.length > 0) track(viewItemList(listId, productIds.map((productId) => ({ productId }))));
    // `signature` captures every input; the effect must not re-run for a new array identity with the same content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return null;
}
