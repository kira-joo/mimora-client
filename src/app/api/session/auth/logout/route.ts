import { NextResponse } from "next/server";
import { ShopEndpoints } from "@/lib/api/shop.endpoints";
import { clearCartToken, clearSession } from "@/lib/session/cookies";
import { shopRequest } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/**
 * Signs out: revokes this device's refresh family on the backend (the refresh
 * cookie reaches this route because it lives under its path), then clears this
 * origin's cookies with the SAME paths they were set on. The local clear runs
 * even if the backend is unreachable — a sign-out button that leaves the
 * customer signed in on a shared device is the failure that matters.
 */
export async function POST(request: Request) {
  await shopRequest(request, ShopEndpoints.logout, { withRefresh: true, allowExpired: true }).catch(() => undefined);
  await clearSession();
  await clearCartToken();
  return new NextResponse(null, { status: 204 });
}
