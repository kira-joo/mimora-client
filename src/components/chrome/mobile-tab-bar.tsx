"use client";

import { useState } from "react";
import { Heart, House, LayoutGrid, ShoppingBag, User, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Link, usePathname } from "@/i18n/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Sparkle } from "@/components/home/ornaments";
import { headerLinks } from "@/lib/chrome/header-links";
import { tabBarRoute, type TabBarRoute } from "@/lib/chrome/tab-bar";
import type { Category } from "@/lib/api/types";
import type { Locale } from "@/i18n/routing";
import { MenuItem } from "./menu-item";

const TAB = "flex min-h-14 flex-col items-center justify-center gap-1 rounded-control px-0.5 text-[0.75rem] font-medium leading-none whitespace-nowrap transition-colors duration-[var(--sf-duration-fast)]";

/**
 * The phone's bottom tab bar (below lg): Home, Categories, Shop now (the raised centre pill), Wishlist, Account — in
 * reading order, so Arabic shows Home at the right and Account at the left, English the mirror. Categories opens a
 * sheet of the Staff-managed category tree (the same rows as the menu drawer); the others are plain links.
 *
 * It is part of the storefront layout, on EVERY page below lg — mounted once in the locale layout, so it persists
 * across navigation rather than remounting. An in-flow spacer of the same height keeps the end of every page clear
 * of it. Its footprint is `--sf-tabbar-space` (globals.css): a page's own bottom bar — a product's purchase bar, the
 * cart's summary — sits on top of it, and the WhatsApp button rises above both.
 */
export function MobileTabBar({ categories }: { categories: Category[] }) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const current = tabBarRoute(pathname);
  const tree = headerLinks([], categories, locale, "").filter((link) => link.key !== "home");
  const tab = (route: TabBarRoute, href: string, label: string, Icon: LucideIcon) => (
    <li>
      <Link href={href} aria-current={current === route ? "page" : undefined} className={cn(TAB, current === route ? "text-action-ink" : "text-ink-secondary hover:text-ink")}>
        <Icon className={cn("size-6", current === route && "fill-blush")} strokeWidth={current === route ? 2 : 1.6} aria-hidden="true" />
        {label}
      </Link>
    </li>
  );

  return (
    <>
      <div aria-hidden="true" className="h-[calc(var(--sf-tabbar-height)+env(safe-area-inset-bottom))] lg:hidden" />
      <nav aria-label={t("tabBar")} className="fixed inset-x-0 bottom-0 z-30 rounded-t-panel border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-[var(--sf-elevation-sheet)] print:hidden lg:hidden">
        <ul className="mx-auto grid h-[var(--sf-tabbar-height)] max-w-xl grid-cols-5 items-center ps-[max(0.5rem,env(safe-area-inset-left))] pe-[max(0.5rem,env(safe-area-inset-right))]">
          {tab("home", "/", t("navHome"), House)}
          <li>
            <button type="button" onClick={() => setSheetOpen(true)} aria-haspopup="dialog" className={cn(TAB, "w-full", current === "categories" ? "text-action-ink" : "text-ink-secondary hover:text-ink")}>
              <LayoutGrid className={cn("size-6", current === "categories" && "fill-blush")} strokeWidth={current === "categories" ? 2 : 1.6} aria-hidden="true" />
              {t("categories")}
              {current === "categories" ? <span className="sr-only">{t("currentSection")}</span> : null}
            </button>
          </li>
          <li className="flex justify-center">
            {/* The focal point: raised out of the bar, ringed in the bar's own colour so it reads as cut from it. */}
            <Link
              href="/products"
              aria-current={current === "shop" ? "page" : undefined}
              className={cn(
                "relative -mt-7 flex min-h-16 min-w-[5.5rem] flex-col items-center justify-center gap-1 rounded-[1.75rem] bg-action px-3 text-[0.8125rem] font-semibold leading-none text-on-action shadow-card ring-4 ring-surface transition-[background-color,translate] duration-[var(--sf-duration-fast)] ease-standard hover:bg-action-hover active:translate-y-px",
                current === "shop" && "outline-2 outline-offset-2 outline-ornament",
              )}
            >
              <Sparkle className="absolute -top-1.5 end-1 size-3.5 text-ornament" />
              <ShoppingBag className="size-6" strokeWidth={1.8} aria-hidden="true" />
              <span className="whitespace-nowrap">{t("shopNow")}</span>
            </Link>
          </li>
          {tab("wishlist", "/account/wishlist", t("wishlistLink"), Heart)}
          {tab("account", "/account", t("account"), User)}
        </ul>
      </nav>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} side="bottom" title={t("categories")} closeLabel={t("closeMenu")}>
        <nav aria-label={t("categories")}>
          <ul className="flex flex-col">
            {[...tree, { key: "shop-all", href: "/products", label: t("shopAll"), children: [] }].map((link) => (
              <MenuItem key={link.key} link={link} onNavigate={() => setSheetOpen(false)} />
            ))}
          </ul>
        </nav>
      </Sheet>
    </>
  );
}
