"use client";

import { Heart, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useStore } from "@/components/providers/store-context";
import { formatDate, localized } from "@/lib/format/numerals";
import { productHref } from "@/lib/links";
import { useWishlist, useWishlistToggle } from "@/lib/wishlist/use-wishlist";
import type { Locale } from "@/i18n/routing";
import { EmptyState, ErrorState, ListSkeleton, PageHeading, SignedIn } from "./states";

/** The saved products. The backend returns only id, slug, name and date — so a row is a link, not a card with a price it doesn't have. Removal is optimistic (use-wishlist). */
export function WishlistView() {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const { timeZone } = useStore();
  const wishlist = useWishlist();
  const toggle = useWishlistToggle();
  const items = wishlist.data?.items ?? [];

  return (
    <SignedIn>
      {() => (
        <>
          <PageHeading title={t("wishlistTitle")} />
          {wishlist.isLoading ? (
            <ListSkeleton />
          ) : wishlist.isError ? (
            <ErrorState onRetry={() => wishlist.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState icon={<Heart className="size-10" />} title={t("wishlistEmptyTitle")} body={t("wishlistEmptyBody")} action={{ href: "/products", label: t("startShopping") }} />
          ) : (
            <ul className="flex flex-col divide-y divide-line border-y border-line">
              {items.map((item) => {
                const name = localized(item.productName, locale);
                return (
                  <li key={item.productId} className="flex items-center justify-between gap-4 py-2">
                    <Link href={item.productSlug ? productHref(item.productSlug) : "/products"} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center py-2 hover:underline">
                      <span className="truncate font-medium">{name}</span>
                      <span className="text-[0.875rem] text-ink-muted">{t("savedOn", { date: formatDate(locale, item.addedAt, timeZone) })}</span>
                    </Link>
                    <button type="button" className="inline-flex size-11 flex-none items-center justify-center text-ink-secondary hover:text-ink disabled:opacity-50" aria-label={t("wishlistRemove", { name })} disabled={toggle.isPending && toggle.variables?.productId === item.productId} onClick={() => toggle.mutate({ productId: item.productId, saved: true })}>
                      <X className="size-5" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </SignedIn>
  );
}
