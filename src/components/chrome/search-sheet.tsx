"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Sheet } from "@/components/ui/sheet";
import { localized } from "@/lib/format/numerals";
import { linkHref } from "@/lib/links";
import type { ResolvedLink } from "@/lib/api/types";
import type { Locale } from "@/i18n/routing";

/** design-system §13b: search opens a full-screen sheet with the field focused, and the store's own category shortcuts. */
export function SearchSheet({ open, onClose, shortcuts }: { open: boolean; onClose(): void; shortcuts: ResolvedLink[] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <Sheet open={open} onClose={onClose} side="full" title={t("search")} closeLabel={t("close")}>
      <form
        role="search"
        className="mx-auto flex max-w-2xl flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          const q = query.trim();
          if (!q) return;
          onClose();
          router.push({ pathname: "/search", query: { q } });
        }}
      >
        <label className="relative block">
          <span className="sr-only">{t("search")}</span>
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input name="q" type="search" enterKeyHint="search" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} className="field ps-11 text-lg" />
        </label>
        {shortcuts.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h3 className="t-label text-ink-muted">{t("browseCategories")}</h3>
            <div className="flex flex-wrap gap-2">
              {shortcuts.map((link) => (
                <Link key={link.slug} href={linkHref(link)} onClick={onClose} className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-[0.9375rem]">
                  {localized(link.label, locale)}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </form>
    </Sheet>
  );
}
