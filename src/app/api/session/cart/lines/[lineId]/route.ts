import { ShopEndpoints } from "@/lib/api/shop.endpoints";
import { jsonBody, shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/** BFF → backend `/api/shop/cart/lines/{lineId}` (no-store; see lib/session/shop-request.ts). */
export async function PUT(request: Request, { params }: { params: Promise<{ lineId: string }> }) {
  return toResponse(await shopRequest(request, ShopEndpoints.cartLineUpdate, { params: await params, body: await jsonBody(request) }));
}

export async function DELETE(request: Request, { params }: { params: Promise<{ lineId: string }> }) {
  return toResponse(await shopRequest(request, ShopEndpoints.cartLineRemove, { params: await params }));
}
