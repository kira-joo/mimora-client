import { ShopEndpoints } from "@/lib/api/shop.endpoints";
import { jsonBody, shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/** BFF → backend `/api/shop/orders/{orderNumber}/cancel` (no-store; see lib/session/shop-request.ts). */
export async function POST(request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  return toResponse(await shopRequest(request, ShopEndpoints.orderCancel, { params: await params, body: await jsonBody(request) }));
}
