import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Link } from "@/i18n/navigation";
import { isLocale, routing, type Locale } from "@/i18n/routing";
import { HandHeart, SolidHeart } from "@/components/home/ornaments";
import { pageGroups } from "@/lib/chrome/footer-links";
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
 *
 * From lg a side list links the store's other published information pages — the
 * same set, in the same order, as the footer's Customer care and Information
 * groups (lib/chrome/footer-links.ts), so it can never link a page that 404s.
 */
export default async function ContentPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  setRequestLocale(locale);
  const [page, content, t] = await Promise.all([getPage(slug), orNull(getContent, "content"), getTranslations("common")]);
  if (!page) notFound();
  const paragraphs = localized(page.content, locale).split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const { care, info } = pageGroups(content?.legalLinks ?? [], content?.footerNavigation ?? []);
  const siblings = [...care, ...info];
  const here = `/pages/${slug}`;

  return (
    <div className="container-sf py-8 lg:py-14">
      <header className="gingham relative mb-8 overflow-hidden rounded-panel px-6 py-10 text-center lg:mb-12 lg:py-14">
        <HandHeart className="absolute start-6 top-6 size-7 -rotate-6 text-ornament lg:start-10 lg:size-9" />
        <SolidHeart className="absolute bottom-6 end-8 size-4 rotate-12 text-ornament lg:end-12" />
        <h1 className="t-title relative text-balance text-heading">{localized(page.title, locale)}</h1>
      </header>
      <div className={cn("grid gap-10", siblings.length > 1 && "lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14")}>
        {siblings.length > 1 ? (
          <nav aria-label={t("infoPagesNav")} className="hidden lg:block">
            <h2 className="mb-3 text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">{t("infoPagesNav")}</h2>
            <ul className="sticky top-28 flex flex-col gap-1 border-s border-line">
              {siblings.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={link.href === here ? "page" : undefined}
                    className={cn(
                      "-ms-px flex min-h-11 items-center border-s-2 ps-4 text-[0.9375rem] transition-colors duration-[var(--sf-duration-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                      link.href === here ? "border-action font-semibold text-heading" : "border-transparent text-ink-secondary hover:text-heading",
                    )}
                  >
                    {localized(link.label, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <article className="mx-auto w-full max-w-3xl rounded-panel bg-surface px-6 py-8 shadow-card sm:px-10 lg:py-12">
          <div className="flex flex-col gap-5 text-[1.0625rem] leading-[1.85] text-ink-secondary">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
