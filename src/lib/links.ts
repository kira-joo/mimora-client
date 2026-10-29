import type { ResolvedLink } from "@/lib/api/types";

/** Where a merchant-configured link points (MDS §4: categories own the canonical product URLs; collections and pages have their own spaces). */
export function linkHref(link: Pick<ResolvedLink, "kind" | "slug">): string {
  if (link.kind === "category") return `/categories/${link.slug}`;
  if (link.kind === "collection") return `/collections/${link.slug}`;
  return `/pages/${link.slug}`;
}

export const productHref = (slug: string) => `/products/${slug}`;
