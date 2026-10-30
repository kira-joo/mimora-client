import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/reveal";
import { StoreImage } from "@/components/ui/store-image";
import type { Locale } from "@/i18n/routing";
import type { Collection, DeliveryZone, FulfilmentSettings, HomeSection, PaymentMethodView } from "@/lib/api/types";
import type { CardProduct } from "@/lib/catalog/card-model";
import { localized } from "@/lib/format/numerals";
import { heroSecondaryAction } from "@/lib/home/hero-actions";
import { buildHeroSlides } from "@/lib/home/hero-slides";
import { MOTION } from "@/lib/motion/tokens";
import { Benefits, benefitItems } from "./benefits";
import { CategoryTiles } from "./category-tiles";
import { GiftBand } from "./gift-band";
import { CampaignHero } from "./hero";
import { ProductRail } from "./product-rail";
import { SectionHead, ViewAll } from "./section-head";

type Section<T extends HomeSection["type"]> = Extract<HomeSection, { type: T }>;

/** Everything a section may need, fetched once by the page. A section with nothing to show renders nothing — no empty scaffolding. */
export interface HomeData {
  /** Every published section, in order — a section may take its cues from a neighbour (the hero shows the benefits and the category photographs). */
  sections: HomeSection[];
  rails: Map<number, CardProduct[]>;
  collections: Collection[];
  fulfilment: FulfilmentSettings | null;
  zones: DeliveryZone[];
  paymentMethods: PaymentMethodView[];
}

export async function HomeSectionView({ section, index, locale, data }: { section: HomeSection; index: number; locale: Locale; data: HomeData }) {
  switch (section.type) {
    case "campaignHero":
      return <HeroSection section={section} locale={locale} data={data} />;
    case "categoryTiles":
      return <CategoryTiles section={section} locale={locale} />;
    case "collectionStory":
      return <CollectionStory section={section} locale={locale} items={data.rails.get(index) ?? []} />;
    case "productRail":
      return <ProductRailSection section={section} locale={locale} items={data.rails.get(index) ?? []} data={data} />;
    case "editorialBand":
      return <GiftBand section={section} collections={data.collections} locale={locale} />;
    case "assuranceStrip":
      return <AssuranceStrip locale={locale} data={data} />;
  }
}

/**
 * The hero reads its neighbours: the showcase rotates the campaign image with the
 * category photographs, the second action leads somewhere the first does not (hero-actions.ts),
 * and — when the store publishes an assurance strip — the strip renders inside the
 * hero as its benefits row instead of as a section of its own.
 */
async function HeroSection({ section, locale, data }: { section: Section<"campaignHero">; locale: Locale; data: HomeData }) {
  const tiles = data.sections.find((candidate): candidate is Section<"categoryTiles"> => candidate.type === "categoryTiles");
  const band = data.sections.find((candidate): candidate is Section<"editorialBand"> => candidate.type === "editorialBand");
  const hasStrip = data.sections.some((candidate) => candidate.type === "assuranceStrip");
  const benefits = hasStrip ? await benefitItems(locale, data.fulfilment, data.zones, data.paymentMethods) : [];
  const action = heroSecondaryAction(section, band, tiles);
  const secondary = action ? { label: localized(action.name, locale), href: action.href } : null;
  return <CampaignHero section={section} locale={locale} slides={buildHeroSlides(section, tiles, locale)} secondary={secondary} benefits={benefits} />;
}

async function ProductRailSection({ section, locale, items, data }: { section: Section<"productRail">; locale: Locale; items: CardProduct[]; data: HomeData }) {
  if (items.length === 0) return null;
  const t = await getTranslations("common");
  const collection = section.collection ? data.collections.find((candidate) => candidate.slug === section.collection?.slug) : undefined;
  const title = localized(section.heading, locale) || (section.collection ? localized(section.collection.name, locale) : t("newest"));
  const subline = collection?.description ? localized(collection.description, locale) : undefined;
  const href = section.collection ? `/collections/${section.collection.slug}` : "/products";
  return (
    <section className="container-sf mt-[var(--sf-section)]">
      <Reveal>
        <SectionHead title={title} subline={subline} action={<ViewAll href={href} label={t("viewAll")} />} />
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

/** A standalone assurance strip — only when the store has no hero to carry it. */
async function AssuranceStrip({ locale, data }: { locale: Locale; data: HomeData }) {
  if (data.sections.some((candidate) => candidate.type === "campaignHero")) return null;
  const items = await benefitItems(locale, data.fulfilment, data.zones, data.paymentMethods);
  if (items.length === 0) return null;
  return (
    <section className="container-sf mt-[var(--sf-section)]">
      <Benefits items={items} className="mx-auto max-w-3xl" />
    </section>
  );
}
