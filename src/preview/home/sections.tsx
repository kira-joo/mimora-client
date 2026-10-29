import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, RotateCcw, Truck, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { getDictionary } from "../i18n";
import { formatNumber, t } from "../format";
import { products, store } from "../fixtures/catalog";
import type { HomeSection, Locale, Product } from "../types";
import { ProductCard } from "../components/product-card";
import { Media } from "../components/media";
import { Reveal } from "../components/reveal";
import { linkHref } from "../links";
import { HeroMotion } from "./hero-motion";

type Section<T extends HomeSection["type"]> = Extract<HomeSection, { type: T }>;

export function HomeSectionView({ section, locale }: { section: HomeSection; locale: Locale }) {
  switch (section.type) {
    case "campaignHero":
      return <CampaignHero section={section} locale={locale} />;
    case "categoryTiles":
      return <CategoryTiles section={section} locale={locale} />;
    case "collectionStory":
      return <CollectionStory section={section} locale={locale} />;
    case "productRail":
      return <ProductRail section={section} locale={locale} />;
    case "editorialBand":
      return <EditorialBand section={section} locale={locale} />;
    case "assuranceStrip":
      return <AssuranceStrip locale={locale} />;
  }
}

/** The rule under a heading — the one element every section type repeats (§10, §13a). */
function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 lg:mb-8">
      <div className="flex items-end justify-between gap-4">
        <h2 className="t-title">{title}</h2>
        {action}
      </div>
      <div className="rule" aria-hidden="true" />
    </div>
  );
}

function ViewAll({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 flex-none items-center gap-1.5 text-[0.9375rem] font-semibold text-action hover:text-action-hover">
      {label}
      <ArrowLeft className="size-4 ltr:-scale-x-100" aria-hidden="true" />
    </Link>
  );
}

/**
 * Campaign hero (§13a): full-bleed photograph, display headline + one line +
 * ONE action on a pre-composed bottom scrim. 4:5-ish at ≈80svh on a phone; up
 * to the viewport below the header on desktop. Type sits bottom-start.
 */
function CampaignHero({ section, locale }: { section: Section<"campaignHero">; locale: Locale }) {
  return (
    <section className="relative isolate overflow-hidden bg-surface-muted">
      <HeroMotion
        image={
          section.image ? (
            <Image src={section.image.src} alt={t(section.image.alt, locale)} fill priority sizes="100vw" className="object-cover object-[center_40%]" />
          ) : null
        }
      >
        <div className="absolute inset-0 -z-0 bg-[linear-gradient(to_top,var(--sf-scrim-strong)_0%,var(--sf-scrim-strong)_18%,var(--sf-scrim-soft)_68%)]" aria-hidden="true" />
        <div className="container-sf relative flex h-full flex-col justify-end pb-10 lg:pb-16">
          <div className="flex max-w-2xl flex-col items-start gap-4 text-on-media">
            <h1 className="t-display text-balance">{t(section.headline, locale)}</h1>
            {section.subline ? <p className="max-w-lg text-[1.0625rem] leading-relaxed opacity-90">{t(section.subline, locale)}</p> : null}
            {section.action ? (
              <Link href={linkHref(locale, section.action.link)} className="btn btn-primary mt-2">
                {t(section.action.label, locale)}
              </Link>
            ) : null}
          </div>
        </div>
      </HeroMotion>
    </section>
  );
}

function CategoryTiles({ section, locale }: { section: Section<"categoryTiles">; locale: Locale }) {
  return (
    <section className="container-sf mt-[var(--sf-section)]">
      <Reveal>
        <SectionHead title={t(section.heading, locale) || getDictionary(locale).browseCategories} />
      </Reveal>
      <ul className={`grid grid-cols-2 gap-3 lg:gap-5 ${section.categories.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
        {section.categories.map((category, index) => (
          <li key={category.slug}>
            <Reveal delay={Math.min(index, 5) * 0.05}>
              <Link href={`/preview/${locale}/products?category=${category.slug}`} className="group relative block">
                <Media image={category.image} locale={locale} ratio="4 / 5" sizes="(min-width: 1024px) 25vw, 50vw" imageClassName="transition-transform duration-[var(--sf-duration-slow)] ease-standard [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03]" />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,var(--sf-scrim-strong),var(--sf-scrim-soft))] px-4 pb-4 pt-12 font-display text-xl font-semibold text-on-media lg:text-2xl">
                  {t(category.name, locale)}
                </span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

function railProducts(source: "collection" | "newest", collectionSlug?: string): Product[] {
  if (source === "newest") return [...products].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 8);
  return products.filter((product) => product.collectionSlugs.includes(collectionSlug ?? "")).slice(0, 8);
}

/**
 * Phone: horizontal scroll-snap showing 2.2 cards — the partial card is the
 * scroll cue. Desktop: a 4-up grid, no scroll (§13a). Cards reveal with the
 * §14 stagger (50ms, first six).
 *
 * `contain: paint` on the scroller is load-bearing: without it, in RTL, Chrome
 * counted the rail's scrolled-away cards as page overflow once they had
 * revealed — the page panned sideways at 375 (measured 42px; 827px when the
 * reveal wrapped the list). Clipping an ancestor, removing scroll-snap and
 * overflow:hidden on the list each left it in place; paint containment is
 * the one change that removed it. Not needed on the desktop grid.
 */
function Rail({ items, locale }: { items: Product[]; locale: Locale }) {
  return (
    <ul className="-mx-[var(--sf-gutter)] flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-[var(--sf-gutter)] px-[var(--sf-gutter)] pb-2 [scrollbar-width:none] max-lg:[contain:paint] lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0">
      {items.map((product, index) => (
        <li key={product.slug} className="w-[calc((100%-1.5rem)/2.2)] flex-none snap-start md:w-[calc((100%-2.25rem)/3.2)] lg:w-auto">
          <Reveal className="h-full" delay={Math.min(index, 5) * 0.05}>
            <ProductCard product={product} locale={locale} sizes="(min-width: 1024px) 25vw, 45vw" />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

function ProductRail({ section, locale }: { section: Section<"productRail">; locale: Locale }) {
  const dict = getDictionary(locale);
  const items = railProducts(section.source, section.collection?.slug);
  if (items.length === 0) return null;
  const title = t(section.heading, locale) || (section.collection ? t(section.collection.name, locale) : dict.newest);
  const href = section.collection ? `/preview/${locale}/products?collection=${section.collection.slug}` : `/preview/${locale}/products?sort=newest`;
  return (
    <section className="container-sf mt-[var(--sf-section)]">
      <Reveal>
        <SectionHead title={title} action={<ViewAll href={href} label={dict.viewAll} />} />
      </Reveal>
      <Rail items={items} locale={locale} />
    </section>
  );
}

/** Collection story: large image beside (desktop) or above (phone) a heading, two lines, then the collection's products. */
function CollectionStory({ section, locale }: { section: Section<"collectionStory">; locale: Locale }) {
  const dict = getDictionary(locale);
  const items = railProducts("collection", section.collection.slug);
  return (
    <section className="container-sf mt-[var(--sf-section)]">
      <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
        <Reveal className="lg:col-span-7">
          <Media image={section.collection.image} locale={locale} ratio="4 / 5" sizes="(min-width: 1024px) 58vw, 100vw" className="lg:aspect-[7/6]!" />
        </Reveal>
        <Reveal className="flex flex-col items-start gap-4 lg:col-span-5" delay={0.05}>
          <span className="t-label text-support">{t(section.collection.name, locale)}</span>
          <h2 className="t-title">{t(section.heading, locale) || t(section.collection.name, locale)}</h2>
          <p className="max-w-md text-[1.0625rem] leading-relaxed text-ink-secondary">{t(section.body, locale) || t(section.collection.description, locale)}</p>
          <ViewAll href={`/preview/${locale}/products?collection=${section.collection.slug}`} label={dict.shopAll} />
        </Reveal>
      </div>
      {items.length > 0 ? (
        <div className="mt-8">
          <Rail items={items} locale={locale} />
        </div>
      ) : null}
    </section>
  );
}

function EditorialBand({ section, locale }: { section: Section<"editorialBand">; locale: Locale }) {
  const dict = getDictionary(locale);
  return (
    <section className="mt-[var(--sf-section)]">
      <Link href={`/preview/${locale}/products?collection=${section.collection.slug}`} className="group relative block">
        <Media image={section.collection.image} locale={locale} ratio="4 / 5" sizes="100vw" className="md:aspect-[16/9]! lg:aspect-[21/9]!" />
        <div className="absolute inset-0 flex items-end bg-[linear-gradient(to_top,var(--sf-scrim-strong),var(--sf-scrim-soft)_70%)]">
          <div className="container-sf flex flex-col items-start gap-3 pb-10 text-on-media lg:pb-14">
            <p className="t-title max-w-3xl text-balance">{t(section.headline, locale)}</p>
            <span className="inline-flex min-h-11 items-center gap-1.5 font-semibold underline-offset-4 group-hover:underline">
              {t(section.collection.name, locale)} — {dict.shopAll}
              <ArrowLeft className="size-4 ltr:-scale-x-100" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}

/** Three facts sourced from fulfilment, returns and payment settings — never typed copy (§13a). */
function AssuranceStrip({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const facts = [
    { icon: Truck, title: dict.assuranceDelivery, body: dict.deliveryLine(formatNumber(locale, store.deliveryDays.min), formatNumber(locale, store.deliveryDays.max)) },
    { icon: RotateCcw, title: dict.assuranceReturns, body: dict.returnsLine(formatNumber(locale, store.returnDays)) },
    { icon: Wallet, title: dict.assurancePayment, body: dict.paymentLine },
  ];
  return (
    <section className="container-sf mt-[var(--sf-section)]">
      <div className="rule mb-8" aria-hidden="true" />
      <ul className="grid gap-6 md:grid-cols-3">
        {facts.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex items-start gap-4">
            <Icon className="mt-1 size-6 flex-none text-support" aria-hidden="true" />
            <div>
              <h3 className="t-heading">{title}</h3>
              <p className="text-[0.9375rem] text-ink-secondary">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
