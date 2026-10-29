import { ShopEndpoints } from "@/lib/api/shop.endpoints";
import { shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/**
 * BFF → backend `/api/shop/orders/{orderNumber}/invoice` (no-store; see lib/session/shop-request.ts). The guest's
 * `x-order-access-token` header is relayed by `shopRequest` exactly as for the order itself; the backend decides access.
 */
export async function GET(request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  return toResponse(await shopRequest(request, ShopEndpoints.orderInvoice, { params: await params }));
}
