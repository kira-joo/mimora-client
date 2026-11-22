import { ShopEndpoints } from "@/lib/api/shop.endpoints";
import { shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/** BFF → backend `/api/shop/quote` (no-store; see lib/session/shop-request.ts). */
export async function POST(request: Request) {
  // Checkout's live delivery form (delivery=true&governorate=…) is relayed as is; the backend validates it.
  const search = new URL(request.url).searchParams;
  const query = search.get("delivery") === "true" ? { delivery: "true", ...(search.get("governorate") ? { governorate: search.get("governorate")! } : {}) } : undefined;
  return toResponse(await shopRequest(request, ShopEndpoints.quote, query ? { query } : {}));
}
