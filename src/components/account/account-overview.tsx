"use client";

import { Heart, MapPin, Package, Undo2, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSignOut } from "@/lib/session/use-session";
import { PageHeading, SignedIn } from "./states";

const LINKS = [
  { href: "/account/orders", title: "accOrders", body: "accOrdersDesc", Icon: Package },
  { href: "/account/addresses", title: "accAddresses", body: "accAddressesDesc", Icon: MapPin },
  { href: "/account/wishlist", title: "accWishlist", body: "accWishlistDesc", Icon: Heart },
  { href: "/account/returns", title: "accReturns", body: "accReturnsDesc", Icon: Undo2 },
  { href: "/account/profile", title: "accProfile", body: "accProfileDesc", Icon: UserRound },
] as const;

export function AccountOverview() {
  const t = useTranslations("common");
  const router = useRouter();
  const signOut = useSignOut();
  return (
    <SignedIn>
      {(customer) => (
        <>
          <PageHeading title={t("accountGreeting", { name: customer.name })} intro={t("accountIntro")} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LINKS.map(({ href, title, body, Icon }) => (
              <li key={href}>
                <Link href={href} className="flex h-full min-h-11 flex-col gap-2 border border-line-strong bg-surface p-5 transition-[border-color] duration-[var(--sf-duration-fast)] hover:border-ink">
                  <Icon className="size-5 text-support" aria-hidden="true" />
                  <span className="font-semibold">{t(title)}</span>
                  <span className="text-[0.9375rem] text-ink-secondary">{t(body)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-secondary mt-8" disabled={signOut.isPending} onClick={() => signOut.mutate(undefined, { onSettled: () => router.replace("/") })}>
            {signOut.isPending ? t("signingOut") : t("signOut")}
          </button>
        </>
      )}
    </SignedIn>
  );
}
