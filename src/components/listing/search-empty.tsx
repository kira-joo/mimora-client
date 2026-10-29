import { getLocale, getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getContent, orNull } from "@/lib/catalog/reads";
import { localized } from "@/lib/format/numerals";
import { linkHref } from "@/lib/links";
import type { Locale } from "@/i18n/routing";

/** No query, or nothing found: say so, keep the field, and offer the store's own categories (MDS §6.4). */
export async function SearchEmpty({ query }: { query?: string }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("common");
  const content = await orNull(getContent, "content");
  const shortcuts = (content?.headerNavigation ?? []).filter((link) => link.kind === "category");
  return (
    <div className="container-sf flex flex-col gap-6 pt-6 lg:pt-10">
      <h1 className="t-title">{query ? t("searchResultsFor", { q: query }) : t("search")}</h1>
      <div className="rule" aria-hidden="true" />
      <form action={`/${locale}/search`} role="search" className="relative max-w-2xl">
        <label>
          <span className="sr-only">{t("search")}</span>
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input name="q" type="search" defaultValue={query} placeholder={t("searchPlaceholder")} className="field ps-11 text-lg" enterKeyHint="search" />
        </label>
      </form>
      {query ? (
        <div className="flex flex-col gap-2">
          <h2 className="t-heading">{t("noSearchResultsTitle")}</h2>
          <p className="text-ink-secondary">{t("noSearchResultsBody", { q: query })}</p>
        </div>
      ) : null}
      {shortcuts.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="t-label text-ink-muted">{t("browseCategories")}</h2>
          <div className="flex flex-wrap gap-2">
            {shortcuts.map((link) => (
              <Link key={link.slug} href={linkHref(link)} className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-[0.9375rem]">
                {localized(link.label, locale)}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
