import { ShopEndpoints } from "@/lib/api/shop.endpoints";
import { shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/** BFF → backend `/api/shop/cart` (no-store; see lib/session/shop-request.ts). */
export async function GET(request: Request) {
  return toResponse(await shopRequest(request, ShopEndpoints.cart));
}
