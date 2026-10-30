"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Sheet } from "@/components/ui/sheet";
import { cartCount, useCart } from "@/lib/cart/use-cart";
import { formatNumber, localized } from "@/lib/format/numerals";
import { linkHref } from "@/lib/links";
import { wordmark } from "@/lib/theme/brand-assets";
import type { ResolvedLink } from "@/lib/api/types";
import type { Locale } from "@/i18n/routing";
import { SearchSheet } from "./search-sheet";
import { LocaleSwitch } from "./locale-switch";
import { GroundSwitch } from "./ground-switch";

interface HeaderProps {
  storeName: string;
  navigation: ResolvedLink[];
}

const ICON_BUTTON = "inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors duration-[var(--sf-duration-fast)] hover:bg-blush-soft";

/**
 * Sticky, solid canvas with a hairline once scrolled — no backdrop blur.
 *
 * Desktop: wordmark, navigation (a fixed "Shop all" link to the whole catalogue, then
 * the merchant's own links), a search field, and account / wishlist / cart. The field
 * is a real search input from `xl`; between `lg` and `xl` there is no room for it, so
 * the search icon opens the search sheet. Phone: menu at the reading start, the
 * wordmark centred, search / wishlist / cart at the reading end; the menu is a drawer
 * holding the same navigation, the account link and the language and ground choices.
 */
export function Header({ storeName, navigation }: HeaderProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const { data: cart } = useCart();
  const count = cartCount(cart);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // "Shop all" is chrome, not content: the catalogue always has a way in, whatever the merchant links.
  const links = [{ key: "shop-all", href: "/products", label: t("shopAll") }, ...navigation.map((link) => ({ key: `${link.kind}-${link.slug}`, href: linkHref(link), label: localized(link.label, locale) }))];

  return (
    <header className={cn("sticky top-0 z-30 bg-canvas transition-[border-color,box-shadow] duration-[var(--sf-duration-fast)]", scrolled ? "border-b border-line shadow-card" : "border-b border-transparent")}>
      <div className="container-sf grid h-[var(--sf-header-height)] grid-cols-[1fr_auto_1fr] items-center gap-2 lg:flex lg:gap-6">
        <div className="flex items-center lg:hidden">
          <button type="button" onClick={() => setMenuOpen(true)} className={cn(ICON_BUTTON, "-ms-2.5")} aria-label={t("menu")} aria-haspopup="dialog">
            <Menu className="size-6" aria-hidden="true" />
          </button>
        </div>

        <Link href="/" className="inline-flex min-h-11 flex-none items-center rounded-lg">
          <Image src={wordmark} alt={storeName} priority sizes="(min-width: 1024px) 150px, 108px" className="h-10 w-auto lg:h-14" />
        </Link>

        <nav aria-label={t("mainNavigation")} className="hidden lg:block">
          <ul className="flex items-center gap-1 text-[0.9375rem] xl:gap-2">
            {links.map((link) => {
              const current = pathname === link.href || (link.href !== "/" && pathname.startsWith(`${link.href}/`));
              return (
                <li key={link.key}>
                  <Link href={link.href} aria-current={current ? "page" : undefined} className={cn("inline-flex min-h-11 items-center rounded-full px-3 font-medium transition-colors duration-[var(--sf-duration-fast)] hover:text-heading xl:px-4", current ? "text-heading underline decoration-ornament decoration-2 underline-offset-8" : "text-ink-secondary")}>
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <form
          role="search"
          className="relative ms-auto hidden min-w-0 max-w-[19rem] flex-1 xl:block"
          onSubmit={(event) => {
            event.preventDefault();
            const q = query.trim();
            if (!q) return;
            router.push({ pathname: "/search", query: { q } });
          }}
        >
          <label>
            <span className="sr-only">{t("search")}</span>
            <Search className="pointer-events-none absolute start-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <input name="q" type="search" enterKeyHint="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} className="field rounded-full bg-surface-muted ps-11 text-[0.9375rem] placeholder:text-ink-muted" />
          </label>
        </form>

        <div className="flex items-center justify-end lg:ms-auto xl:ms-0">
          <button type="button" onClick={() => setSearchOpen(true)} className={cn(ICON_BUTTON, "xl:hidden")} aria-label={t("search")} aria-haspopup="dialog">
            <Search className="size-[22px]" aria-hidden="true" />
          </button>
          <GroundSwitch variant="toggle" className={cn(ICON_BUTTON, "hidden lg:inline-flex")} />
          <Link href="/account" className={cn(ICON_BUTTON, "hidden lg:inline-flex")} aria-label={t("account")}>
            <User className="size-[22px]" aria-hidden="true" />
          </Link>
          <Link href="/account/wishlist" className={ICON_BUTTON} aria-label={t("wishlistLink")}>
            <Heart className="size-[22px]" aria-hidden="true" />
          </Link>
          <Link href="/cart" className={cn(ICON_BUTTON, "relative -me-2.5 lg:me-0")} aria-label={t("cartCount", { n: formatNumber(locale, count) })}>
            <ShoppingBag className="size-[22px]" aria-hidden="true" />
            {count > 0 ? (
              <span aria-live="polite" className="tabular absolute end-0.5 top-0.5 min-w-[18px] rounded-full bg-action px-1 text-center text-[0.6875rem] font-semibold leading-[18px] text-on-action">
                {formatNumber(locale, count)}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} side="start" title={t("menu")} closeLabel={t("closeMenu")}>
        <nav aria-label={t("mainNavigation")}>
          <ul className="flex flex-col">
            {[...links, { key: "account", href: "/account", label: t("account") }, { key: "wishlist", href: "/account/wishlist", label: t("wishlistLink") }].map((link) => (
              <li key={link.key} className="border-b border-line">
                <Link href={link.href} onClick={() => setMenuOpen(false)} className="flex min-h-14 items-center justify-between font-display text-lg text-ink">
                  {link.label}
                  <ChevronLeft className="size-4 text-ink-muted ltr:-scale-x-100" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-8 flex flex-col gap-4">
          <LocaleSwitch />
          <GroundSwitch />
        </div>
      </Sheet>

      <SearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} shortcuts={navigation.filter((link) => link.kind === "category")} />
    </header>
  );
}
