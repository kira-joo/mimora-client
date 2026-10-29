import { ShopEndpoints } from "@/lib/api/shop.endpoints";
import { clearCartToken } from "@/lib/session/cookies";
import { jsonBody, shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/**
 * BFF → backend `/api/shop/auth/login`. The guest cart token travels with it,
 * so the backend merges the guest cart into the customer's (B-3). Once it
 * reports the merge done, the guest token points at nothing and is dropped. A
 * merge that failed rolled back and left the guest cart intact — then the token
 * is KEPT, or the customer's items would be orphaned.
 */
export async function POST(request: Request) {
  const result = await shopRequest<{ cartMerge?: { merged: boolean } }>(request, ShopEndpoints.login, { body: await jsonBody(request), allowExpired: true });
  if (result.status < 300 && result.data?.cartMerge?.merged) await clearCartToken();
  return toResponse(result);
}
