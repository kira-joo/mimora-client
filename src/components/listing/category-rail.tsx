import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Link } from "@/i18n/navigation";
import { SolidHeart } from "@/components/home/ornaments";
import { toSearch, type ListingState } from "@/lib/catalog/listing-query";
import { formatNumber } from "@/lib/format/numerals";
import type { Locale } from "@/i18n/routing";
import { RailScroller } from "./rail-scroller";

export interface CategoryOption {
  slug: string;
  label: string;
  count: number;
}

/**
 * Shop by category: the boutique's shelves as one strip of pills across the
 * top of the listing, in place of a sidebar. Each pill is a real link to the
 * same listing with that category chosen (every other filter kept), so it is
 * server-rendered and works without scripting. The chosen shelf wears a filled pill and a small heart. The strip
 * scrolls sideways when it must, fading at its ends — symmetric, so the same
 * mask serves both writing directions.
 */
export async function CategoryRail({ locale, basePath, state, categories }: { locale: Locale; basePath: string; state: ListingState; categories: CategoryOption[] }) {
  const t = await getTranslations("common");
  const ui = await getTranslations("common.listingUi");
  const href = (category?: string) => `${basePath}${toSearch({ ...state, category, page: 1 })}`;
  const pill = (current: boolean) =>
    cn(
      "inline-flex min-h-12 items-center gap-2 whitespace-nowrap rounded-pill border px-5 text-[0.9375rem] font-medium transition-colors duration-[var(--sf-duration-fast)] ease-standard",
      current ? "border-action bg-action text-on-action" : "border-line-strong bg-surface text-ink hover:bg-blush-soft"
    );
  return (
    <nav aria-label={ui("categoriesNav")}>
      <RailScroller activeKey={state.category ?? ""} className="-mx-[var(--sf-gutter)] overflow-x-auto overscroll-x-contain px-[var(--sf-gutter)] py-1 [mask-image:linear-gradient(to_right,transparent_0,black_var(--sf-gutter),black_calc(100%-var(--sf-gutter)),transparent_100%)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex w-max min-w-full gap-2.5">
          <li>
            <Link href={href(undefined)} aria-current={state.category ? undefined : "true"} className={pill(!state.category)} scroll={false}>
              {state.category ? <Sparkles className="size-4 text-ornament" aria-hidden="true" /> : <SolidHeart className="size-3.5" />}
              {t("allCategories")}
            </Link>
          </li>
          {categories.map((category) => {
            const current = state.category === category.slug;
            return (
              <li key={category.slug}>
                <Link href={href(category.slug)} aria-current={current ? "true" : undefined} className={pill(current)} scroll={false}>
                  {current ? <SolidHeart className="size-3.5" /> : null}
                  {category.label}
                  <span className={cn("tabular text-[0.8125rem] font-normal", current ? "text-on-action" : "text-ink-secondary")}>{formatNumber(locale, category.count)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </RailScroller>
    </nav>
  );
}
