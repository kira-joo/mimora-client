import { ShopEndpoints } from "@/lib/api/shop.endpoints";
import { shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/** BFF → backend `/api/shop/wishlist/{productId}` (no-store; see lib/session/shop-request.ts). */
export async function DELETE(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  return toResponse(await shopRequest(request, ShopEndpoints.wishlistRemove, { params: await params }));
}
