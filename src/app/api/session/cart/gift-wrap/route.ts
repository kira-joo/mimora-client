import { ShopEndpoints } from "@/lib/api/shop.endpoints";
import { jsonBody, shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/** Gift box & wrapping on the shopper's cart — forwarded server-to-server like every cart write. */
export async function PUT(request: Request) {
  return toResponse(await shopRequest(request, ShopEndpoints.cartGiftWrap, { body: await jsonBody(request) }));
}
