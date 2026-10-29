"use client";

import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "@/lib/api/session-client";
import { CatalogEndpoints } from "@/lib/api/session.endpoints";
import type { MatrixVariant } from "@/lib/api/types";

/**
 * The live variant matrix for one product — stock is transactional and never
 * cached (MDS §5). `initial` is the page's cached matrix: shown while the live
 * one loads so a selector click never waits, then replaced. Low-stock text is
 * shown only from LIVE data (`isLive`), never from the cache.
 */
export function useAvailability(slug: string, options: { enabled?: boolean; initial?: MatrixVariant[] } = {}) {
  const query = useQuery({
    queryKey: ["availability", slug],
    queryFn: ({ signal }) => catalogApi().request(CatalogEndpoints.availability, { params: { slug }, signal }).then((response) => response.variants),
    enabled: options.enabled ?? true,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  return { variants: query.data ?? options.initial, isLive: query.data !== undefined, isLoading: query.isLoading, error: query.error };
}
