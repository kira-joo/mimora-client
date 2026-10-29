import { ShopPrivacyEndpoints } from "@/lib/api/privacy.endpoints";
import { jsonBody, shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/** BFF → backend `/api/shop/profile/marketing-consent` (no-store; see lib/session/shop-request.ts). */
export async function PUT(request: Request) {
  return toResponse(await shopRequest(request, ShopPrivacyEndpoints.marketingConsent, { body: await jsonBody(request) }));
}
