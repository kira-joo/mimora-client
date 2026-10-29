"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, Menu, Search, ShoppingBag, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Sheet } from "@/components/ui/sheet";
import { cartCount, useCart } from "@/lib/cart/use-cart";
import { formatNumber, localized } from "@/lib/format/numerals";
import { linkHref } from "@/lib/links";
import type { ImageAsset, ResolvedLink } from "@/lib/api/types";
import type { Locale } from "@/i18n/routing";
import { SearchSheet } from "./search-sheet";
import { LocaleSwitch } from "./locale-switch";
import { GroundSwitch } from "./ground-switch";

interface HeaderProps {
  storeName: string;
  logo: ImageAsset | null;
  navigation: ResolvedLink[];
}

/**
 * design-system §13b: 56px, sticky, solid canvas with a hairline once scrolled
 * — no backdrop blur. Menu at the reading start, the mark centred, search,
 * account and cart at the reading end. Desktop shows the merchant's header
 * navigation in one row.
 */
export function Header({ storeName, logo, navigation }: HeaderProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const { data: cart } = useCart();
  const count = cartCount(cart);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const mark = logo?.secureUrl ? (
    <Image src={logo.secureUrl} alt={storeName} width={logo.width ?? 120} height={logo.height ?? 40} className="h-8 w-auto" priority />
  ) : (
    storeName
  );

  return (
    <header className={`sticky top-0 z-30 bg-canvas transition-[border-color] duration-[var(--sf-duration-fast)] ${scrolled ? "border-b border-line" : "border-b border-transparent"}`}>
      <div className="container-sf grid h-[var(--sf-header-height)] grid-cols-[1fr_auto_1fr] items-center gap-2 lg:h-[72px] lg:grid-cols-[auto_1fr_auto] lg:gap-8">
        <div className="flex items-center">
          <button type="button" onClick={() => setMenuOpen(true)} className="-ms-2.5 inline-flex size-11 items-center justify-center lg:hidden" aria-label={t("menu")}>
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <Link href="/" className="hidden min-h-11 items-center font-display text-2xl font-semibold lg:inline-flex">
            {mark}
          </Link>
        </div>
        <Link href="/" className="inline-flex min-h-11 items-center font-display text-xl font-semibold lg:hidden">
          {mark}
        </Link>
        <nav aria-label={t("mainNavigation")} className="hidden lg:block">
          <ul className="flex items-center gap-7 text-[0.9375rem]">
            {navigation.map((link) => (
              <li key={`${link.kind}-${link.slug}`}>
                <Link href={linkHref(link)} className="py-2 text-ink-secondary transition-colors duration-[var(--sf-duration-fast)] hover:text-ink">
                  {localized(link.label, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center justify-end">
          <button type="button" onClick={() => setSearchOpen(true)} className="inline-flex size-11 items-center justify-center" aria-label={t("search")}>
            <Search className="size-5" aria-hidden="true" />
          </button>
          <Link href="/account" className="hidden size-11 items-center justify-center sm:inline-flex" aria-label={t("account")}>
            <User className="size-5" aria-hidden="true" />
          </Link>
          <Link href="/cart" className="relative -me-2.5 inline-flex size-11 items-center justify-center" aria-label={t("cartCount", { n: formatNumber(locale, count) })}>
            <ShoppingBag className="size-5" aria-hidden="true" />
            {count > 0 ? (
              <span aria-live="polite" className="tabular absolute end-1 top-1.5 min-w-[18px] rounded-full bg-action px-1 text-center text-[0.6875rem] font-semibold leading-[18px] text-on-action">
                {formatNumber(locale, count)}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} side="start" title={t("menu")} closeLabel={t("close")}>
        <ul className="flex flex-col">
          {navigation.map((link) => (
            <li key={`${link.kind}-${link.slug}`} className="border-b border-line">
              <Link href={linkHref(link)} onClick={() => setMenuOpen(false)} className="flex min-h-14 items-center justify-between text-lg">
                {localized(link.label, locale)}
                <ChevronLeft className="size-4 text-ink-muted ltr:-scale-x-100" aria-hidden="true" />
              </Link>
            </li>
          ))}
          <li className="border-b border-line">
            <Link href="/account" onClick={() => setMenuOpen(false)} className="flex min-h-14 items-center justify-between text-lg">
              {t("account")}
              <ChevronLeft className="size-4 text-ink-muted ltr:-scale-x-100" aria-hidden="true" />
            </Link>
          </li>
        </ul>
        <div className="mt-8 flex flex-col gap-4">
          <LocaleSwitch />
          <GroundSwitch />
        </div>
      </Sheet>

      <SearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} shortcuts={navigation.filter((link) => link.kind === "category")} />
    </header>
  );
}
