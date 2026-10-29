"use client";

import { useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Link, usePathname } from "@/i18n/navigation";

const SECTIONS = [
  { href: "/account", key: "accOverview", exact: true },
  { href: "/account/orders", key: "accOrders" },
  { href: "/account/addresses", key: "accAddresses" },
  { href: "/account/wishlist", key: "accWishlist" },
  { href: "/account/returns", key: "accReturns" },
  { href: "/account/profile", key: "accProfile" },
] as const;

/** Section links; the current one is marked with aria-current and an underline (not colour alone). Scrolls sideways on a phone rather than wrapping. */
export function AccountNav() {
  const t = useTranslations("common");
  const pathname = usePathname();
  return (
    <nav aria-label={t("accountNav")} className="border-b border-line">
      <ul className="container-sf flex gap-6 overflow-x-auto">
        {SECTIONS.map((section) => {
          const current = "exact" in section ? pathname === section.href : pathname === section.href || pathname.startsWith(`${section.href}/`);
          return (
            <li key={section.href} className="flex-none">
              <Link
                href={section.href}
                aria-current={current ? "page" : undefined}
                className={cn("inline-flex min-h-12 items-center border-b-2 text-[0.9375rem] font-medium", current ? "border-ink text-ink" : "border-transparent text-ink-secondary hover:text-ink")}
              >
                {t(section.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
