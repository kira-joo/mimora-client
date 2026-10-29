import { ShopEndpoints } from "@/lib/api/shop.endpoints";
import { shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/** BFF → backend `/api/shop/orders/{orderNumber}` (no-store; see lib/session/shop-request.ts). */
export async function GET(request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  return toResponse(await shopRequest(request, ShopEndpoints.orderDetail, { params: await params, query: Object.fromEntries(new URL(request.url).searchParams) }));
}
