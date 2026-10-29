import { ShopEndpoints } from "@/lib/api/shop.endpoints";
import { jsonBody, shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/** BFF → backend `/api/shop/orders` (no-store; see lib/session/shop-request.ts). */
export async function GET(request: Request) {
  return toResponse(await shopRequest(request, ShopEndpoints.orderList, { query: Object.fromEntries(new URL(request.url).searchParams) }));
}

export async function POST(request: Request) {
  return toResponse(await shopRequest(request, ShopEndpoints.orderPlace, { body: await jsonBody(request) }));
}
