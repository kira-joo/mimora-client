import Link from "next/link";
import { notFound } from "next/navigation";
import { findCategory, findProduct, products } from "../../../../../preview/fixtures/catalog";
import { getDictionary } from "../../../../../preview/i18n";
import { t } from "../../../../../preview/format";
import { ProductDetail } from "../../../../../preview/pdp/product-detail";
import { ProductCard } from "../../../../../preview/components/product-card";
import type { Locale } from "../../../../../preview/types";

export function generateStaticParams() {
  return products.flatMap((product) => [{ locale: "ar", slug: product.slug }, { locale: "en", slug: product.slug }]);
}

/** Product detail (MDS §6.3, §10) — the most important screen. */
export default async function PreviewProduct({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const product = findProduct(slug);
  if (!product) notFound();
  const dict = getDictionary(locale);
  const category = findCategory(product.categorySlug);
  const related = products.filter((candidate) => candidate.slug !== product.slug && candidate.categorySlug === product.categorySlug).slice(0, 4);

  return (
    <div className="sf-pdp container-sf pt-4 lg:pt-8">
      <nav aria-label={locale === "ar" ? "مسار التنقل" : "Breadcrumb"} className="mb-4 hidden text-[0.875rem] text-ink-muted lg:block">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={`/preview/${locale}`} className="hover:text-ink">
              {dict.breadcrumbHome}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          {category ? (
            <li>
              <Link href={`/preview/${locale}/products?category=${category.slug}`} className="hover:text-ink">
                {t(category.name, locale)}
              </Link>
            </li>
          ) : null}
        </ol>
      </nav>

      <ProductDetail product={product} locale={locale} />

      <div className="mt-[var(--sf-section)] grid gap-10 lg:grid-cols-12 lg:gap-12">
        <section className="lg:col-span-7">
          <h2 className="t-heading mb-3">{dict.description}</h2>
          <p className="max-w-[65ch] text-[1.0625rem] leading-[1.8] text-ink-secondary">{t(product.description, locale)}</p>
        </section>
        {product.specs.length > 0 ? (
          <section className="lg:col-span-5">
            <h2 className="t-heading mb-3">{dict.specifications}</h2>
            {/* The spec block: measurements separated by the rule (§10) — figures tabular, codes in mono. */}
            <div className="rule" aria-hidden="true" />
            <dl className="divide-y divide-line">
              {product.specs.map((row) => (
                <div key={row.label.en} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-3">
                  <dt className="text-[0.9375rem] text-ink-secondary">{t(row.label, locale)}</dt>
                  <dd className="tabular text-[0.9375rem] font-medium">{t(row.value, locale)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </div>

      {related.length > 0 ? (
        <section className="mt-[var(--sf-section)]">
          <h2 className="t-title mb-3">{dict.related}</h2>
          <div className="rule mb-6" aria-hidden="true" />
          <ul className="grid grid-cols-2 gap-x-2.5 gap-y-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
            {related.map((item) => (
              <ProductCard key={item.slug} as="li" subgrid product={item} locale={locale} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
