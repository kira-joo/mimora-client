import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/routing";
import { getCategories, getCollections, getContent, getDeliveryZones, getFulfilmentSettings, getPaymentMethods, getStoreProfile, listProducts, orNull } from "@/lib/catalog/reads";
import { toCardProduct } from "@/lib/catalog/card-model";
import { loadPromotionBadges } from "@/lib/catalog/promotion-badges";
import { HomeSectionView, type HomeData } from "@/components/home/sections";

// = CATALOG_REVALIDATE_SECONDS (lib/cache/cache-tag.ts). Segment config must be a literal, so it is repeated here.
export const revalidate = 300;

/**
 * Home — the merchant's published sections, in their order (MDS §6.1). Every
 * section is configured, none hardcoded, and the page renders correctly with
 * no hero, no collections and an empty catalog. ISR with cache tags; nothing
 * transactional on it.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  setRequestLocale(locale);

  const [content, categories, collections, fulfilment, zones, paymentMethods, profile] = await Promise.all([
    orNull(getContent, "content"),
    orNull(getCategories, "categories"),
    orNull(getCollections, "collections"),
    orNull(getFulfilmentSettings, "fulfilment settings"),
    orNull(getDeliveryZones, "delivery zones"),
    orNull(getPaymentMethods, "payment methods"),
    orNull(getStoreProfile, "store profile"),
  ]);
  const badges = await loadPromotionBadges(locale, profile?.currency ?? "XXX");
  const sections = content?.homeSections ?? [];
  // eslint-disable-next-line react-hooks/purity -- an async Server Component renders once per request or revalidation, not repeatedly; `now` is one stable instant for every badge on the page.
  const now = Date.now();

  // One listing read per product-bearing section, in parallel.
  const rails = new Map<number, ReturnType<typeof toCardProduct>[]>();
  await Promise.all(
    sections.map(async (section, index) => {
      const collectionSlug = section.type === "collectionStory" ? section.collection.slug : section.type === "productRail" && section.source === "collection" ? section.collection?.slug : undefined;
      if (section.type !== "productRail" && section.type !== "collectionStory") return;
      const collectionId = collectionSlug ? collections?.find((collection) => collection.slug === collectionSlug)?._id : undefined;
      if (collectionSlug && !collectionId) return;
      // "newest" is the listing's default order, so it needs no sort parameter.
      const page = await orNull(() => listProducts({ limit: 8, ...(collectionId ? { collectionId } : {}) }), `home rail ${index}`);
      if (page) rails.set(index, page.data.map((product) => toCardProduct(product, locale, categories ?? [], now, badges)));
    })
  );

  const data: HomeData = { sections, rails, collections: collections ?? [], fulfilment, zones: zones ?? [], paymentMethods: paymentMethods ?? [] };
  return (
    <>
      {sections.map((section, index) => (
        <HomeSectionView key={`${section.type}-${index}`} section={section} index={index} locale={locale} data={data} />
      ))}
    </>
  );
}
