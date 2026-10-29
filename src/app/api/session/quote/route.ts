import { ShopEndpoints } from "@/lib/api/shop.endpoints";
import { shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/** BFF → backend `/api/shop/quote` (no-store; see lib/session/shop-request.ts). */
export async function POST(request: Request) {
  return toResponse(await shopRequest(request, ShopEndpoints.quote));
}
