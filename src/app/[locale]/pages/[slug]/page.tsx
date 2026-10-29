import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale, routing, type Locale } from "@/i18n/routing";
import { getContent, getPage, orNull } from "@/lib/catalog/reads";
import { storeAlternates } from "@/lib/seo/alternates";
import { localized } from "@/lib/format/numerals";

// = CATALOG_REVALIDATE_SECONDS; segment config must be a literal.
export const revalidate = 300;

/** The legal pages always exist (legal-and-consent.md); the rest come from the merchant's navigation. */
const LEGAL = ["terms", "privacy", "returns", "shipping", "cookies", "accessibility", "contact"];

/**
 * D-15: an unreachable backend yields no prebuilt pages (rendered on first request, then ISR), never a failed build —
 * the same rule as the product page. "Always exist" is not "always prebuildable": prebuilding a legal slug with no
 * backend made its body read throw and failed the whole build (CI, 2026-10-23). The outage is already announced by
 * orNull's `[catalog] content failed` line.
 */
export async function generateStaticParams() {
  const content = await orNull(getContent, "content");
  if (!content) return [];
  const linked = [...content.footerNavigation, ...content.headerNavigation, ...content.legalLinks].filter((link) => link.kind === "page").map((link) => link.slug);
  const slugs = [...new Set([...LEGAL, ...linked])];
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const page = await orNull(() => getPage(slug), "page (metadata)");
  if (!page) return {};
  return {
    title: localized(page.seo?.title, locale) || localized(page.title, locale),
    description: localized(page.seo?.description, locale) || undefined,
    alternates: { canonical: `/${locale}/pages/${slug}`, languages: await storeAlternates(`/pages/${slug}`) },
  };
}

/**
 * A content page — about, contact, legal, size advice — localized and from the
 * backend (MDS §6.11). The body is plain text authored in the backoffice:
 * rendered as paragraphs, never as HTML, so a page can never inject markup.
 */
export default async function ContentPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  setRequestLocale(locale);
  const page = await getPage(slug);
  if (!page) notFound();
  const paragraphs = localized(page.content, locale).split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  return (
    <article className="container-sf max-w-3xl py-8 lg:py-14">
      <h1 className="t-title mb-3">{localized(page.title, locale)}</h1>
      <div className="rule mb-8" aria-hidden="true" />
      <div className="flex flex-col gap-5 text-[1.0625rem] leading-[1.85] text-ink-secondary">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}
