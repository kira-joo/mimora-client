"use client";

import Link from "next/link";
import { ChevronLeft, Menu, Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getDictionary } from "../i18n";
import { formatNumber, t } from "../format";
import { categories, products, store } from "../fixtures/catalog";
import type { Locale, ResolvedLink, StorefrontContent } from "../types";
import { usePreviewState } from "../state";
import { Sheet } from "./sheet";
import { linkHref } from "../links";


/**
 * §13a: one message, optional link, static — no marquee, no rotation.
 * Dismissible and remembered for the session.
 */
export function AnnouncementBar({ locale, announcement }: { locale: Locale; announcement: StorefrontContent["announcement"] }) {
  const dict = getDictionary(locale);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("sf-preview-announcement-dismissed") === "1") setHidden(true);
    } catch {
      /* storage blocked — shown */
    }
  }, []);
  if (!announcement || hidden) return null;
  const text = t(announcement.message, locale);
  return (
    <div className="bg-support text-on-support">
      <div className="container-sf flex min-h-10 items-center justify-center gap-2 text-center text-[0.8125rem] font-medium">
        {announcement.link ? (
          <Link href={linkHref(locale, announcement.link)} className="py-2 underline-offset-4 hover:underline">
            {text}
          </Link>
        ) : (
          <span className="py-2">{text}</span>
        )}
        <button
          type="button"
          className="-me-2 inline-flex size-10 flex-none items-center justify-center"
          aria-label={dict.dismiss}
          onClick={() => {
            setHidden(true);
            try {
              window.sessionStorage.setItem("sf-preview-announcement-dismissed", "1");
            } catch {
              /* storage blocked */
            }
          }}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/**
 * §13b header: 56px, sticky, solid canvas with a hairline once scrolled — no
 * backdrop blur. Menu at the reading start, mark centred, search and cart at
 * the reading end. Desktop shows the merchant's header navigation in one row.
 */
export function Header({ locale, navigation }: { locale: Locale; navigation: ResolvedLink[] }) {
  const dict = getDictionary(locale);
  const { lines } = usePreviewState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const count = lines.reduce((total, line) => total + line.quantity, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-30 bg-canvas transition-[border-color] duration-[var(--sf-duration-fast)] ${scrolled ? "border-b border-line" : "border-b border-transparent"}`}>
      <div className="container-sf grid h-[var(--sf-header-height)] grid-cols-[1fr_auto_1fr] items-center gap-2 lg:h-[72px] lg:grid-cols-[auto_1fr_auto] lg:gap-8">
        <div className="flex items-center">
          <button type="button" onClick={() => setMenuOpen(true)} className="-ms-2.5 inline-flex size-11 items-center justify-center lg:hidden" aria-label={dict.menu}>
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <Link href={`/preview/${locale}`} className="hidden font-display text-2xl font-semibold lg:inline">
            {t(store.name, locale)}
          </Link>
        </div>
        <Link href={`/preview/${locale}`} className="font-display text-xl font-semibold lg:hidden">
          {t(store.name, locale)}
        </Link>
        <nav aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main"} className="hidden lg:block">
          <ul className="flex items-center gap-7 text-[0.9375rem]">
            {navigation.map((link) => (
              <li key={`${link.kind}-${link.slug}`}>
                <Link href={linkHref(locale, link)} className="py-2 text-ink-secondary transition-colors duration-[var(--sf-duration-fast)] hover:text-ink">
                  {t(link.label, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center justify-end">
          <button type="button" onClick={() => setSearchOpen(true)} className="inline-flex size-11 items-center justify-center" aria-label={dict.search}>
            <Search className="size-5" aria-hidden="true" />
          </button>
          <Link href={`/preview/${locale}/cart`} className="relative -me-2.5 inline-flex size-11 items-center justify-center" aria-label={dict.cartCount(formatNumber(locale, count))}>
            <ShoppingBag className="size-5" aria-hidden="true" />
            <span aria-live="polite" className="tabular absolute end-1 top-1.5 min-w-[18px] rounded-full bg-action px-1 text-center text-[0.6875rem] font-semibold leading-[18px] text-on-action">
              {formatNumber(locale, count)}
            </span>
          </Link>
        </div>
      </div>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} side="start" title={dict.menu} closeLabel={dict.close}>
        <ul className="flex flex-col">
          {navigation.map((link) => (
            <li key={`${link.kind}-${link.slug}`} className="border-b border-line">
              <Link href={linkHref(locale, link)} onClick={() => setMenuOpen(false)} className="flex min-h-14 items-center justify-between text-lg">
                {t(link.label, locale)}
                <ChevronLeft className="size-4 text-ink-muted ltr:-scale-x-100" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </Sheet>

      <SearchSheet locale={locale} open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}

/** §13b: search opens a full-screen sheet with the field focused, recent searches and category shortcuts. */
function SearchSheet({ locale, open, onClose }: { locale: Locale; open: boolean; onClose(): void }) {
  const dict = getDictionary(locale);
  const [query, setQuery] = useState("");
  const matches = query.trim() ? products.filter((product) => t(product.name, locale).toLowerCase().includes(query.trim().toLowerCase())).slice(0, 5) : [];
  const recent = locale === "ar" ? ["قميص كتان", "إزميل"] : ["linen shirt", "chisel"];

  return (
    <Sheet open={open} onClose={onClose} side="full" title={dict.search} closeLabel={dict.close}>
      <form action={`/preview/${locale}/products`} className="mx-auto flex max-w-2xl flex-col gap-6">
        <label className="relative block">
          <span className="sr-only">{dict.search}</span>
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          {/* Focused on open: the sheet exists to type into (§13b). */}
          <input name="q" type="search" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={dict.searchPlaceholder} className="field ps-11 text-lg" />
        </label>
        {matches.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line">
            {matches.map((product) => (
              <li key={product.slug}>
                <Link href={`/preview/${locale}/products/${product.slug}`} onClick={onClose} className="flex min-h-12 items-center py-2">
                  {t(product.name, locale)}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <section className="flex flex-col gap-3">
              <h3 className="t-label text-ink-muted">{dict.recentSearches}</h3>
              <div className="flex flex-wrap gap-2">
                {recent.map((term) => (
                  <Link key={term} href={`/preview/${locale}/products?q=${encodeURIComponent(term)}`} onClick={onClose} className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-[0.9375rem]">
                    {term}
                  </Link>
                ))}
              </div>
            </section>
            <section className="flex flex-col gap-3">
              <h3 className="t-label text-ink-muted">{dict.browseCategories}</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Link key={category.slug} href={`/preview/${locale}/products?category=${category.slug}`} onClick={onClose} className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-[0.9375rem]">
                    {t(category.name, locale)}
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </form>
    </Sheet>
  );
}

/** Footer: the merchant's footer navigation, the legal pages always (they cannot be removed), contact and newsletter capture (#42 — capture only). */
export function Footer({ locale, content }: { locale: Locale; content: StorefrontContent }) {
  const dict = getDictionary(locale);
  return (
    <footer className="mt-[var(--sf-section)] border-t border-line bg-surface-muted">
      <div className="container-sf grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <span className="font-display text-2xl font-semibold">{t(store.name, locale)}</span>
          <p className="max-w-xs text-[0.9375rem] text-ink-secondary">{t(store.tagline, locale)}</p>
          <bdi dir="ltr" className="code text-ink-secondary">
            {store.phone}
          </bdi>
        </div>
        <FooterList title={dict.footerShop} links={content.footerNavigation} locale={locale} />
        <FooterList title={dict.footerLegal} links={content.legalLinks} locale={locale} />
        <form className="flex flex-col gap-3" onSubmit={(event) => event.preventDefault()}>
          <h3 className="t-heading">{dict.newsletter}</h3>
          <p className="text-[0.9375rem] text-ink-secondary">{dict.newsletterBody}</p>
          <div className="flex gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">{dict.emailOptional}</span>
              <input type="email" dir="ltr" placeholder="you@example.com" className="field" />
            </label>
            <button type="submit" className="btn btn-secondary">
              {dict.subscribe}
            </button>
          </div>
        </form>
      </div>
    </footer>
  );
}

function FooterList({ title, links, locale }: { title: string; links: ResolvedLink[]; locale: Locale }) {
  return (
    <nav aria-label={title} className="flex flex-col gap-3">
      <h3 className="t-heading">{title}</h3>
      <ul className="flex flex-col">
        {links.map((link) => (
          <li key={`${link.kind}-${link.slug}`}>
            <Link href={linkHref(locale, link)} className="inline-flex min-h-11 items-center text-[0.9375rem] text-ink-secondary hover:text-ink">
              {t(link.label, locale)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
