import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { isKnownCacheTag } from "@/lib/cache/cache-tag";
import { revalidateSecret } from "@/lib/config/server-env";

export const dynamic = "force-dynamic";

/**
 * The receiving end of cache invalidation (architecture.md §6). The backend's
 * route factory POSTs `{ tags }` here with `X-Revalidate-Secret` after every
 * successful admin mutation (store-platform-staff publish-revalidation.ts).
 *
 * Its absence was the third silence in the composition that once left
 * prerendered pages serving a stale price indefinitely while the cart charged
 * the new one — so it exists from the first tagged read, and it is loud.
 *
 * - The secret is compared in constant time (lengths first; that leaks only
 *   the length).
 * - Unauthorised is 404, not 401: a 401 confirms the route is worth attacking.
 * - Only this app's known tags are honoured; an unknown one is logged loudly —
 *   it means the two vocabularies drifted, whose symptom is content that never
 *   updates.
 * - `{ expire: 0 }`, not `"max"`: with stale-while-revalidate the first
 *   request after a price change would still be served the OLD price.
 */
function authorised(request: Request): boolean {
  const expected = revalidateSecret();
  const provided = request.headers.get("x-revalidate-secret");
  if (!expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorised(request)) return new NextResponse(null, { status: 404 });

  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string") : [];
  if (tags.length === 0) return NextResponse.json({ message: "No tags." }, { status: 400 });

  const unknown: string[] = [];
  for (const tag of tags) {
    if (isKnownCacheTag(tag)) revalidateTag(tag, { expire: 0 });
    else unknown.push(tag);
  }
  if (unknown.length > 0) {
    console.error(`[revalidate] the backend published ${unknown.length} tag(s) this app does not know: ${unknown.join(", ")}. Cached content behind them will NOT update — check src/lib/cache/cache-tag.ts against the backend's emitted tags.`);
  }
  console.info(`[revalidate] ${tags.filter(isKnownCacheTag).join(", ") || "nothing"} invalidated.`);
  return new NextResponse(null, { status: 204 });
}
