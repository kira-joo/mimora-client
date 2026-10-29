import type { Locale, ResolvedLink } from "./types";

/** Where a resolved content link goes inside the preview. Pages are not built in the preview, so they anchor on home. */
export const linkHref = (locale: Locale, link: Pick<ResolvedLink, "kind" | "slug">) =>
  link.kind === "page" ? `/preview/${locale}#${link.slug}` : `/preview/${locale}/products?${link.kind}=${link.slug}`;
