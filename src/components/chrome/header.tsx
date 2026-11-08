"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Sheet } from "@/components/ui/sheet";
import { cartCount, useCart } from "@/lib/cart/use-cart";
import { formatNumber } from "@/lib/format/numerals";
import { headerLinks, isCurrentLink, topLevelCategories } from "@/lib/chrome/header-links";
import { wordmark } from "@/lib/theme/brand-assets";
import type { Category, ResolvedLink } from "@/lib/api/types";
import type { Locale } from "@/i18n/routing";
import { SearchSheet } from "./search-sheet";
import { LocaleSwitch } from "./locale-switch";
import { GroundSwitch } from "./ground-switch";
import { MenuItem } from "./menu-item";
import { NavDropdown } from "./nav-dropdown";

interface HeaderProps {
  storeName: string;
  navigation: ResolvedLink[];
  /** The storefront's published categories — the source of the menu's categories and their dropdowns. */
  categories: Category[];
}

const ICON_BUTTON = "inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors duration-[var(--sf-duration-fast)] hover:bg-blush-soft";
const NAV_LINK = "inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 font-medium transition-colors duration-[var(--sf-duration-fast)] hover:text-heading";
const NAV_LINK_CURRENT = "text-heading underline decoration-ornament decoration-2 underline-offset-8";

/**
 * Sticky, solid canvas with a hairline once scrolled — no backdrop blur.
 *
 * Desktop (xl and up): wordmark, navigation (a fixed "Home" link, then the category tree
 * from Staff — top-level categories, each with a dropdown of its sub-categories — then any
 * collection or page links from the storefront content), search, and account / wishlist /
 * cart. The menu needs the whole row: measured on one line it is ~740–830px, which does not
 * fit below xl, and beside it a search field would be crushed to nothing below 2xl — so the
 * field is a real input from 2xl, and between xl and 2xl the search icon opens the sheet.
 * Below xl: menu at the reading start, the wordmark centred, and at the reading end search and
 * cart (from lg also the ground, account and wishlist). The wordmark sits between two equal
 * `minmax(0, 1fr)` columns, so it is centred on the viewport whatever either side holds. On a
 * phone (below lg) search is a field-shaped button and account / wishlist live in the bottom
 * tab bar (mobile-tab-bar.tsx) instead. The menu is a drawer holding the same navigation
 * (sub-categories as an expandable row), the account link and the language and ground choices.
 */
export function Header({ storeName, navigation, categories }: HeaderProps) {
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

  // "Home" is chrome, not content; the categories are the Staff-managed tree (see headerLinks).
  const links = headerLinks(navigation, categories, locale, t("navHome"));

  return (
    <header className={cn("sticky top-0 z-30 bg-canvas transition-[border-color,box-shadow] duration-[var(--sf-duration-fast)]", scrolled ? "border-b border-line shadow-card" : "border-b border-transparent")}>
      <div className="container-sf grid h-[var(--sf-header-height)] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 xl:flex xl:gap-6">
        <div className="flex items-center xl:hidden">
          <button type="button" onClick={() => setMenuOpen(true)} className={cn(ICON_BUTTON, "-ms-2.5")} aria-label={t("menu")} aria-haspopup="dialog">
            <Menu className="size-6" aria-hidden="true" />
          </button>
        </div>

        <Link href="/" className="inline-flex min-h-11 flex-none items-center rounded-lg">
          <Image src={wordmark} alt={storeName} priority sizes="(min-width: 1024px) 150px, 108px" className="h-10 w-auto lg:h-14" />
        </Link>

        <nav aria-label={t("mainNavigation")} className="hidden xl:block">
          <ul className="flex items-center gap-1 text-[0.9375rem]">
            {links.map((link) => {
              const current = isCurrentLink(link, pathname);
              const className = cn(NAV_LINK, current ? NAV_LINK_CURRENT : "text-ink-secondary");
              if (link.children.length > 0) return <NavDropdown key={link.key} link={link} current={current} linkClassName={className} />;
              return (
                <li key={link.key}>
                  <Link href={link.href} aria-current={current ? "page" : undefined} className={className}>
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <form
          role="search"
          className="relative ms-auto hidden min-w-0 max-w-[19rem] flex-1 2xl:block"
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

        <div className="flex min-w-0 items-center justify-end xl:ms-auto 2xl:ms-0">
          {/* Phone: search is a field-shaped button that opens the search sheet; it takes whatever the column leaves
              (76px at 375, 104px at 430 — the centred wordmark fixes the rest). It carries the short "Search" label,
              never the placeholder sentence, and only while the pill is wide enough to show the whole word (a
              container query on the pill's own width; Arabic's word is the shorter): a word cut off reads as broken,
              so a narrower pill is the icon alone, centred. The name is on the button either way. */}
          <button type="button" onClick={() => setSearchOpen(true)} aria-haspopup="dialog" aria-label={t("search")} className="@container flex min-h-11 min-w-0 flex-1 rounded-full bg-surface-muted px-3 text-[0.875rem] text-ink-muted transition-colors duration-[var(--sf-duration-fast)] hover:bg-blush-soft lg:hidden">
            <span className="flex w-full items-center justify-center gap-1.5 rtl:@[3rem]:justify-start ltr:@[4.75rem]:justify-start">
              <Search className="size-[18px] flex-none text-ink" aria-hidden="true" />
              <span className="hidden whitespace-nowrap rtl:@[3rem]:inline ltr:@[4.75rem]:inline">{t("search")}</span>
            </span>
          </button>
          <button type="button" onClick={() => setSearchOpen(true)} className={cn(ICON_BUTTON, "hidden lg:inline-flex 2xl:hidden")} aria-label={t("search")} aria-haspopup="dialog">
            <Search className="size-[22px]" aria-hidden="true" />
          </button>
          <GroundSwitch variant="toggle" className={cn(ICON_BUTTON, "hidden lg:inline-flex")} />
          <Link href="/account" className={cn(ICON_BUTTON, "hidden lg:inline-flex")} aria-label={t("account")}>
            <User className="size-[22px]" aria-hidden="true" />
          </Link>
          <Link href="/account/wishlist" className={cn(ICON_BUTTON, "hidden lg:inline-flex")} aria-label={t("wishlistLink")}>
            <Heart className="size-[22px]" aria-hidden="true" />
          </Link>
          <Link href="/cart" className={cn(ICON_BUTTON, "relative -me-2.5 xl:me-0")} aria-label={t("cartCount", { n: formatNumber(locale, count) })}>
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
            {[...links, { key: "account", href: "/account", label: t("account"), children: [] }, { key: "wishlist", href: "/account/wishlist", label: t("wishlistLink"), children: [] }].map((link) => (
              <MenuItem key={link.key} link={link} onNavigate={() => setMenuOpen(false)} />
            ))}
          </ul>
        </nav>
        <div className="mt-8 flex flex-col gap-4">
          <LocaleSwitch />
          <GroundSwitch />
        </div>
      </Sheet>

      <SearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} shortcuts={topLevelCategories(categories).map((category) => ({ kind: "category", slug: category.slug, label: category.name }))} />
    </header>
  );
}
