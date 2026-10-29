import { ShopEndpoints } from "@/lib/api/shop.endpoints";
import { shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/** BFF → backend `/api/shop/returns/{id}` (no-store; see lib/session/shop-request.ts). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return toResponse(await shopRequest(request, ShopEndpoints.returnDetail, { params: await params, query: Object.fromEntries(new URL(request.url).searchParams) }));
}
