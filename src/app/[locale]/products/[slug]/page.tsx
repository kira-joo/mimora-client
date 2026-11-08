import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, routing, type Locale } from "@/i18n/routing";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductHero } from "@/components/product/product-hero";
import { ProductCard } from "@/components/product/product-card";
import { Reviews } from "@/components/product/reviews";
import { storeAssurances } from "@/lib/catalog/assurances";
import { productTrail } from "@/lib/catalog/breadcrumbs";
import { toCardProduct } from "@/lib/catalog/card-model";
import { loadPromotionBadges } from "@/lib/catalog/promotion-badges";
import { promotionFor } from "@/lib/catalog/promotions";
import { getBrands, getCategories, getDeliveryZones, getFulfilmentSettings, getPaymentMethods, getProductDetail, getReviews, getSizeGuide, getStoreProfile, listAllProducts, listProducts, orNull } from "@/lib/catalog/reads";
import { selectRelated } from "@/lib/catalog/related";
import { siteOrigin } from "@/lib/config/site-origin";
import { absoluteUrl, breadcrumbListJsonLd, productJsonLd } from "@/lib/seo/structured-data";
import { sizeTable } from "@/lib/catalog/size-guide";
import { storeAlternates } from "@/lib/seo/alternates";
import { localized } from "@/lib/format/numerals";
import { storeTimeZone } from "@/lib/config/startup-check";

// = CATALOG_REVALIDATE_SECONDS; segment config must be a literal.
export const revalidate = 300;

type Props = { params: Promise<{ locale: string; slug: string }> };

/**
 * `generateStaticParams` is not optional here (MDS §5): without it the page is
 * dynamic by inheritance and the ISR story quietly stops being true. D-15: an
 * unreachable backend yields no prebuilt pages (rendered on first request),
 * never a failed build.
 */
export async function generateStaticParams() {
  // Every product, not the first page of them (a catalogue past 100 would otherwise render its tail on first request).
  const products = await orNull(listAllProducts, "product slugs");
  return routing.locales.flatMap((locale) => (products ?? []).map((product) => ({ locale, slug: product.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const detail = await orNull(() => getProductDetail(slug), "product (metadata)");
  if (!detail) return {};
  const { product } = detail;
  // No `openGraph` here: a page-level `openGraph` would replace the layout's, and link previews use the Mimora logo
  // on every page rather than a product image.
  return {
    title: localized(product.seoTitle, locale) || localized(product.name, locale),
    description: localized(product.seoDescription, locale) || localized(product.description, locale).slice(0, 160),
    alternates: { canonical: `/${locale}/products/${slug}`, languages: await storeAlternates(`/products/${slug}`) },
  };
}

/** Product detail (MDS §6.3, §10) — the most important screen. ISR for content and price; availability is live in the buy box. */
export default async function ProductPage({ params }: Props) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  setRequestLocale(locale);
  const t = await getTranslations("common");

  const detail = await getProductDetail(slug);
  if (!detail) notFound();
  const { product, variants } = detail;

  const [categories, brands, profile, fulfilment, zones, paymentMethods, reviews, guide, related] = await Promise.all([
    orNull(getCategories, "categories"),
    product.brandId ? orNull(getBrands, "brands") : Promise.resolve(null),
    orNull(getStoreProfile, "store profile"),
    orNull(getFulfilmentSettings, "fulfilment settings"),
    orNull(getDeliveryZones, "delivery zones"),
    orNull(getPaymentMethods, "payment methods"),
    orNull(() => getReviews(product._id), "reviews"),
    product.sizeGuide ? orNull(() => getSizeGuide(product.sizeGuide!), "size guide") : Promise.resolve(null),
    product.categoryId ? orNull(() => listProducts({ categoryId: product.categoryId, limit: 8 }), "related") : Promise.resolve(null),
  ]);

  const name = localized(product.name, locale);
  const table = sizeTable(guide, locale);
  // eslint-disable-next-line react-hooks/purity -- an async Server Component renders once per request or revalidation, not repeatedly; `now` is one stable instant for every badge on the page.
  const now = Date.now();
  const badges = await loadPromotionBadges(locale, profile?.currency ?? "XXX");
  const relatedCards = selectRelated(related?.data ?? [], product.slug).map((item) => toCardProduct(item, locale, categories ?? [], now, badges));
  const promotion = promotionFor(badges, { productId: product._id, categoryId: product.categoryId, collectionIds: product.collectionIds });
  const description = localized(product.description, locale);
  const specs = product.attributes.map((attribute) => ({ key: attribute.key, label: localized(attribute.name, locale), value: attribute.values.map((value) => localized(value.value, locale)).join(locale === "ar" ? "، " : ", ") })).filter((row) => row.value);

  // One trail feeds the visible breadcrumbs AND the BreadcrumbList: Home › the real category ancestor chain › the product.
  const trail = productTrail({ homeLabel: t("breadcrumbHome"), locale, categories: categories ?? [], categoryId: product.categoryId, productName: name });
  const origin = siteOrigin();
  const productUrl = absoluteUrl(origin, locale, `/products/${product.slug}`);
  const brand = product.brandId ? brands?.find((candidate) => candidate._id === product.brandId) : undefined;

  // Structured data (MDS §21): a Product with an Offer per variant — sku, url, price, currency and availability each
  // (BackOrder for a variant sold past zero). Availability here is the CACHED view — search engines read it at crawl time;
  // the buy box is the live one. No currency, no offers: a price without a currency is not a price.
  const productData = productJsonLd({
    name,
    description,
    imageUrls: product.images.map((image) => image.secureUrl),
    brandName: brand ? localized(brand.name, locale) : undefined,
    rating: product.ratingsSummary,
    variants: variants.map((variant) => ({ variantId: variant.variantId, sku: variant.sku, price: variant.price, purchasable: variant.purchasable, onBackorder: variant.onBackorder })),
    currency: profile?.currency,
    url: productUrl,
  });

  return (
    <div className="sf-pdp container-sf pt-4 lg:pt-8">
      <JsonLd data={productData} />
      <JsonLd data={breadcrumbListJsonLd(trail, { origin, locale, currentPath: `/products/${product.slug}` })} />
      <Breadcrumbs trail={trail} className="mb-4" />

      <ProductHero
        productId={product._id}
        productImages={product.images}
        productName={name}
        slug={product.slug}
        optionAxes={product.optionAxes}
        initialVariants={variants}
        rating={product.ratingsSummary}
        image={product.images[0] ?? null}
        assurances={storeAssurances(locale, t, fulfilment, zones ?? [], paymentMethods ?? [])}
        sizeGuide={table && guide ? { title: localized(guide.name, locale), description: localized(guide.description, locale) || undefined, table } : null}
        promotion={promotion}
        details={
          // Beside the image on desktop (filling the column under the purchase controls); on a phone the same place it
          // always had — straight after the purchase controls — so the phone flow is unchanged.
          description ? (
            <section className="mt-[var(--sf-section)] lg:mt-8 lg:border-t lg:border-line lg:pt-6">
              <h2 className="t-heading mb-3">{t("description")}</h2>
              <p className="max-w-[65ch] text-[1.0625rem] leading-[1.8] text-ink-secondary">{description}</p>
            </section>
          ) : null
        }
      />

      {specs.length > 0 ? (
        <div className="mt-[var(--sf-section)] grid gap-10 lg:grid-cols-12 lg:gap-12">
          <section className="lg:col-span-7">
            <h2 className="t-heading mb-3">{t("specifications")}</h2>
            <div className="rule" aria-hidden="true" />
            <dl className="divide-y divide-line">
              {specs.map((row) => (
                <div key={row.key} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-3">
                  <dt className="text-[0.9375rem] text-ink-secondary">{row.label}</dt>
                  <dd className="tabular text-[0.9375rem] font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      ) : null}

      <Reviews reviews={reviews} rating={product.ratingsSummary} timeZone={storeTimeZone()} />

      {relatedCards.length > 0 ? (
        <section className="mt-[var(--sf-section)]">
          <h2 className="t-title mb-3">{t("related")}</h2>
          <div className="rule mb-6" aria-hidden="true" />
          <ul className="grid grid-cols-2 gap-x-2.5 gap-y-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
            {relatedCards.map((item) => (
              <ProductCard key={item.slug} as="li" subgrid product={item} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
