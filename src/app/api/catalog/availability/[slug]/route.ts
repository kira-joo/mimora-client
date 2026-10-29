import { NextResponse } from "next/server";
import { storefrontApi } from "@/lib/api/storefront-client";
import { StorefrontEndpoints } from "@/lib/api/storefront.endpoints";

export const dynamic = "force-dynamic";

/**
 * Live availability for one product — the variant matrix, `no-store`.
 *
 * The product page is ISR (content and price), and stock is transactional
 * (MDS §5): a cached "in stock" sells something that is gone. So the page's
 * cached matrix is provisional and the selector replaces it with this, fetched
 * fresh on mount. Only availability crosses — the browser still never learns
 * the backend's origin, because it asks this origin.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const detail = await storefrontApi().request(StorefrontEndpoints.productDetail, { params: { slug }, transport: { cache: "no-store" } });
    return NextResponse.json({ variants: detail.variants }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 503;
    return NextResponse.json({ statusCode: status, message: "Availability is unavailable right now." }, { status: status === 404 ? 404 : 503 });
  }
}
