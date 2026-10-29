import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowLeft, RotateCcw, Truck, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/reveal";
import { StoreImage } from "@/components/ui/store-image";
import type { Locale } from "@/i18n/routing";
import type { DeliveryZone, FulfilmentSettings, HomeSection, PaymentMethodView } from "@/lib/api/types";
import type { CardProduct } from "@/lib/catalog/card-model";
import { localized } from "@/lib/format/numerals";
import { storeAssurances } from "@/lib/catalog/assurances";
import { linkHref } from "@/lib/links";
import { HeroMotion } from "./hero-motion";
import { ProductRail } from "./product-rail";
import { MOTION } from "@/lib/motion/tokens";

type Section<T extends HomeSection["type"]> = Extract<HomeSection, { type: T }>;

/** Everything a section may need, fetched once by the page. A section with nothing to show renders nothing — no empty scaffolding. */
export interface HomeData {
  rails: Map<number, CardProduct[]>;
  fulfilment: FulfilmentSettings | null;
  zones: DeliveryZone[];
  paymentMethods: PaymentMethodView[];
}

export async function HomeSectionView({ section, index, locale, data }: { section: HomeSection; index: number; locale: Locale; data: HomeData }) {
  switch (section.type) {
    case "campaignHero":
      return <CampaignHero section={section} locale={locale} />;
    case "categoryTiles":
      return <CategoryTiles section={section} locale={locale} />;
    case "collectionStory":
      return <CollectionStory section={section} locale={locale} items={data.rails.get(index) ?? []} />;
    case "productRail":
      return <ProductRailSection section={section} locale={locale} items={data.rails.get(index) ?? []} />;
    case "editorialBand":
      return <EditorialBand section={section} locale={locale} />;
    case "assuranceStrip":
      return <AssuranceStrip locale={locale} data={data} />;
  }
}

/** The rule under a heading — the one element every section type repeats (design-system §10, §13a). */
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

/** Campaign hero (§13a): full-bleed photograph, display headline + one line + ONE action on a pre-composed bottom scrim. */
function CampaignHero({ section, locale }: { section: Section<"campaignHero">; locale: Locale }) {
  return (
    <section className="relative isolate overflow-hidden bg-surface-muted">
      <HeroMotion image={section.image?.secureUrl ? <Image src={section.image.secureUrl} alt="" fill priority sizes="100vw" className="object-cover object-[center_40%]" /> : null}>
        <div className="absolute inset-0 -z-0 bg-[linear-gradient(to_top,var(--sf-scrim-strong)_0%,var(--sf-scrim-strong)_18%,var(--sf-scrim-soft)_68%)]" aria-hidden="true" />
        <div className="container-sf relative flex h-full flex-col justify-end pb-10 lg:pb-16">
          <div className="flex max-w-2xl flex-col items-start gap-4 text-on-media">
            <h1 className="t-display text-balance">{localized(section.headline, locale)}</h1>
            {section.subline ? <p className="max-w-lg text-[1.0625rem] leading-relaxed opacity-90">{localized(section.subline, locale)}</p> : null}
            {section.action ? (
              <Link href={linkHref(section.action.link)} className="btn btn-primary mt-2">
                {localized(section.action.label, locale)}
              </Link>
            ) : null}
          </div>
        </div>
      </HeroMotion>
    </section>
  );
}

async function CategoryTiles({ section, locale }: { section: Section<"categoryTiles">; locale: Locale }) {
  if (section.categories.length === 0) return null;
  const t = await getTranslations("common");
  return (
    <section className="container-sf mt-[var(--sf-section)]">
      <Reveal>
        <SectionHead title={localized(section.heading, locale) || t("browseCategories")} />
      </Reveal>
      <ul className={`grid grid-cols-2 gap-3 lg:gap-5 ${section.categories.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
        {section.categories.map((category, index) => (
          <li key={category.slug}>
            <Reveal delay={Math.min(index, 5) * MOTION.stagger}>
              <Link href={`/categories/${category.slug}`} className="group relative block">
                <StoreImage image={category.image} alt="" ratio="4 / 5" sizes="(min-width: 1024px) 25vw, 50vw" imageClassName="transition-transform duration-[var(--sf-duration-slow)] ease-standard [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03]" />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,var(--sf-scrim-strong),var(--sf-scrim-soft))] px-4 pb-4 pt-12 font-display text-xl font-semibold text-on-media lg:text-2xl">
                  {localized(category.name, locale)}
                </span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function ProductRailSection({ section, locale, items }: { section: Section<"productRail">; locale: Locale; items: CardProduct[] }) {
  if (items.length === 0) return null;
  const t = await getTranslations("common");
  const title = localized(section.heading, locale) || (section.collection ? localized(section.collection.name, locale) : t("newest"));
  const href = section.collection ? `/collections/${section.collection.slug}` : "/products";
  return (
    <section className="container-sf mt-[var(--sf-section)]">
      <Reveal>
        <SectionHead title={title} action={<ViewAll href={href} label={t("viewAll")} />} />
      </Reveal>
      <ProductRail items={items} />
    </section>
  );
}

/** Collection story: large image beside (desktop) or above (phone) a heading, two lines, then the collection's products. */
async function CollectionStory({ section, locale, items }: { section: Section<"collectionStory">; locale: Locale; items: CardProduct[] }) {
  const t = await getTranslations("common");
  const name = localized(section.collection.name, locale);
  const body = localized(section.body, locale) || localized(section.collection.description, locale);
  return (
    <section className="container-sf mt-[var(--sf-section)]">
      <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
        <Reveal className="lg:col-span-7">
          <StoreImage image={section.collection.image} alt="" ratio="4 / 5" sizes="(min-width: 1024px) 58vw, 100vw" className="lg:aspect-[7/6]!" />
        </Reveal>
        <Reveal className="flex flex-col items-start gap-4 lg:col-span-5" delay={MOTION.stagger}>
          <span className="t-label text-support">{name}</span>
          <h2 className="t-title">{localized(section.heading, locale) || name}</h2>
          {body ? <p className="max-w-md text-[1.0625rem] leading-relaxed text-ink-secondary">{body}</p> : null}
          <ViewAll href={`/collections/${section.collection.slug}`} label={t("shopAll")} />
        </Reveal>
      </div>
      {items.length > 0 ? (
        <div className="mt-8">
          <ProductRail items={items} />
        </div>
      ) : null}
    </section>
  );
}

async function EditorialBand({ section, locale }: { section: Section<"editorialBand">; locale: Locale }) {
  const t = await getTranslations("common");
  return (
    <section className="mt-[var(--sf-section)]">
      <Link href={`/collections/${section.collection.slug}`} className="group relative block">
        <StoreImage image={section.collection.image} alt="" ratio="4 / 5" sizes="100vw" className="md:aspect-[16/9]! lg:aspect-[21/9]!" />
        <div className="absolute inset-0 flex items-end bg-[linear-gradient(to_top,var(--sf-scrim-strong),var(--sf-scrim-soft)_70%)]">
          <div className="container-sf flex flex-col items-start gap-3 pb-10 text-on-media lg:pb-14">
            <p className="t-title max-w-3xl text-balance">{localized(section.headline, locale)}</p>
            <span className="inline-flex min-h-11 items-center gap-1.5 font-semibold underline-offset-4 group-hover:underline">
              {localized(section.collection.name, locale)} — {t("shopAll")}
              <ArrowLeft className="size-4 ltr:-scale-x-100" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}

/** The store's assurances (lib/catalog/assurances.ts) — the same facts the product page shows beside its button. */
async function AssuranceStrip({ locale, data }: { locale: Locale; data: HomeData }) {
  const t = await getTranslations("common");
  const facts = storeAssurances(locale, t, data.fulfilment, data.zones, data.paymentMethods);
  const items = [
    facts.delivery ? { icon: Truck, title: t("assuranceDelivery"), body: facts.delivery } : null,
    facts.returns ? { icon: RotateCcw, title: t("assuranceReturns"), body: facts.returns } : null,
    facts.payment ? { icon: Wallet, title: t("assurancePayment"), body: facts.payment } : null,
  ].filter((item) => item !== null);
  if (items.length === 0) return null;
  return (
    <section className="container-sf mt-[var(--sf-section)]">
      <div className="rule mb-8" aria-hidden="true" />
      <ul className={`grid gap-6 ${items.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {items.map(({ icon: Icon, title, body }) => (
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
