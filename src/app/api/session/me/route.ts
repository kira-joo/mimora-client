import { NextResponse } from "next/server";
import { ShopEndpoints } from "@/lib/api/shop.endpoints";
import { sessionState } from "@/lib/session/cookies";
import { shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/**
 * Who is signed in. A guest is a normal answer (`{ customer: null }`), not an
 * error — guest checkout is first-class (MDS §7). An EXPIRED session answers
 * 401 so the client refreshes, rather than reading as a guest.
 */
export async function GET(request: Request) {
  const state = await sessionState();
  if (state === "anonymous") return NextResponse.json({ customer: null }, { headers: { "Cache-Control": "no-store" } });
  const result = await shopRequest(request, ShopEndpoints.profile);
  if (result.status !== 200) return toResponse(result);
  return NextResponse.json({ customer: result.data }, { headers: { "Cache-Control": "no-store" } });
}
