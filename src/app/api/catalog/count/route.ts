import { NextResponse } from "next/server";
import { getBrands, getCategories, getCollections, listProducts } from "@/lib/catalog/reads";
import { parseListing, toApiQuery } from "@/lib/catalog/listing-query";

export const dynamic = "force-dynamic";

/**
 * How many products a DRAFT filter would show — the number on the filter
 * sheet's button, so a filter that would empty the grid is seen before it is
 * applied (design-system §13b). Product content, so it rides the same tagged
 * Data Cache as the listing itself; nothing transactional.
 */
export async function GET(request: Request) {
  const state = parseListing(Object.fromEntries(new URL(request.url).searchParams));
  const [categories, collections, brands] = await Promise.all([getCategories(), getCollections(), getBrands()]);
  const query = toApiQuery({ ...state, page: 1 }, { categories, collections, brands }, 1);
  if (!query) return NextResponse.json({ total: 0 });
  try {
    const page = await listProducts(query);
    return NextResponse.json({ total: page.total });
  } catch {
    return NextResponse.json({ total: null }, { status: 503 });
  }
}
