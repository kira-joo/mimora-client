import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/reveal";
import type { Locale } from "@/i18n/routing";
import type { HomeSection, ResolvedEntity } from "@/lib/api/types";
import { localized } from "@/lib/format/numerals";
import { MOTION } from "@/lib/motion/tokens";
import { categoryPicture, type CategoryPicture as Picture } from "@/lib/home/category-picture";
import { Sparkle } from "./ornaments";
import { SectionHead, ViewAll } from "./section-head";

/** Card width on the tablet/desktop row, by how many share a row (at most four; gap-5 = 1.25rem between). */
const WIDTHS: Record<number, string> = {
  1: "lg:w-full",
  2: "lg:w-[calc((100%-1.25rem)/2)]",
  3: "lg:w-[calc((100%-2.5rem)/3)]",
  4: "lg:w-[calc((100%-3.75rem)/4)]",
};

/**
 * Shop by category — the categories the store's content lists, each with its one picture: the category's own image
 * from Staff (`categoryPicture`), the same hosted file on every screen size. Tablet/desktop: rows of up to four panels — picture, name, one
 * line and a circular arrow — a short last row centred. Phone: a horizontal scroll-snap row of small scooped-corner
 * shortcut cards; the partial card at the end is the scroll cue, and `contain: paint` keeps the scrolled-away cards
 * from counting as page overflow in RTL.
 */
export async function CategoryTiles({ section, locale }: { section: Extract<HomeSection, { type: "categoryTiles" }>; locale: Locale }) {
  if (section.categories.length === 0) return null;
  const t = await getTranslations("common");
  return (
    <section className="container-sf mt-[var(--sf-section)]">
      <Reveal>
        <SectionHead title={localized(section.heading, locale) || t("browseCategories")} action={<ViewAll href="/products" label={t("shopAll")} />} />
      </Reveal>
      <ul className="-mx-[var(--sf-gutter)] flex snap-x snap-mandatory scroll-px-[var(--sf-gutter)] gap-3 overflow-x-auto px-[var(--sf-gutter)] pb-4 pt-1 [contain:paint] [scrollbar-width:none] lg:hidden">
        {section.categories.map((category, index) => (
          <ShortcutTile key={category.slug} category={category} locale={locale} index={index} />
        ))}
      </ul>
      {/* Tablet/desktop: up to four per row, a short last row centred (seven categories read 4 + 3). */}
      <ul className="hidden flex-wrap justify-center gap-5 lg:flex">
        {section.categories.map((category, index) => {
          const name = localized(category.name, locale);
          const description = category.description ? localized(category.description, locale) : "";
          return (
            <li key={category.slug} className={WIDTHS[Math.min(section.categories.length, 4)]}>
              <Reveal className="h-full" delay={Math.min(index, 5) * MOTION.stagger}>
                <Link
                  href={`/categories/${category.slug}`}
                  className="group flex h-full flex-col rounded-card bg-panel p-2 shadow-card outline-offset-4 transition-transform duration-[var(--sf-duration-standard)] ease-standard focus-visible:outline-2 focus-visible:outline-focus [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5"
                >
                  <CategoryPicture picture={categoryPicture(category.image)} frame="panel" sizes="24vw" />
                  <span className="flex items-center justify-between gap-3 px-2.5 pb-2 pt-3">
                    <span className="min-w-0">
                      <span className="block font-display text-[1.125rem] font-semibold leading-snug text-ink">{name}</span>
                      {description ? <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-muted">{description}</span> : null}
                    </span>
                    <span
                      className="flex size-9 flex-none items-center justify-center rounded-full border border-line-strong text-ink transition-colors duration-[var(--sf-duration-fast)] group-hover:border-action group-hover:bg-action group-hover:text-on-action"
                      aria-hidden="true"
                    >
                      <ArrowLeft className="size-4 ltr:-scale-x-100" />
                    </span>
                  </span>
                </Link>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * One phone shortcut. The outline is the `sf-scoop` mask (so the wrapper, not the card,
 * carries the soft lift — a box-shadow would be clipped by the mask, and so would an outline: the keyboard focus ring
 * is an outline on that unmasked wrapper, and the inner stitch line turns solid with it). The name has room for two lines.
 */
function ShortcutTile({ category, locale, index }: { category: ResolvedEntity; locale: Locale; index: number }) {
  const name = localized(category.name, locale);
  return (
    <li className="w-[6.75rem] flex-none snap-start first:ms-auto last:me-auto md:w-[8.5rem]">
      <Reveal className="h-full" delay={Math.min(index, 5) * MOTION.stagger}>
        {/* The mask clips any outline on the card itself, so the keyboard ring is drawn here, on the unmasked wrapper. */}
        <div className="sf-lift h-full rounded-card outline-offset-2 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-focus">
          <Link
            href={`/categories/${category.slug}`}
            className="sf-scoop group relative flex h-full min-h-[9.5rem] flex-col items-center gap-2 bg-blush-soft px-2 pb-3 pt-2.5 focus-visible:outline-none md:min-h-[11rem]"
          >
            <span aria-hidden="true" className="pointer-events-none absolute inset-1 rounded-[0.75rem] border border-dashed border-ornament/35 group-focus-visible:border-2 group-focus-visible:border-solid group-focus-visible:border-focus" />
            <Sparkle aria-hidden="true" className="absolute end-2.5 top-2.5 size-2.5 text-ornament" />
            <CategoryPicture picture={categoryPicture(category.image)} frame="arch" sizes="(min-width: 768px) 8.5rem, 6.75rem" />
            <span className="block text-balance text-center font-display text-[0.8125rem] font-semibold leading-snug text-heading md:text-[0.9375rem]">{name}</span>
          </Link>
        </div>
      </Reveal>
    </li>
  );
}

/**
 * A category's one picture (`categoryPicture` — its image from Staff), drawn the same way on every screen size.
 *
 * An illustration is shown whole and centred on a soft halo over the card's pink — never cropped or stretched: the img
 * keeps its own aspect (w/h auto inside max bounds), so `clip-path` percentages are percentages of the artwork. The
 * 4.5% side clip removes only the slivers of neighbouring drawings the files carry along their left and right edges
 * (≤ 3.1% of the width); every illustration keeps ≥ 6.5% clear margin there. That clip is an assumption about the
 * illustration set uploaded today — a future PNG whose artwork runs to its side edges would lose 4.5% of each side.
 *
 * A category without an illustration shows its Staff image in the card's own frame: an arch on the phone, the rounded
 * panel on tablet/desktop (a transparent PNG is contained rather than cropped).
 */
function CategoryPicture({ picture, frame, sizes }: { picture: Picture; frame: "arch" | "panel"; sizes: string }) {
  const box = frame === "arch" ? "aspect-[5/6] w-full" : "aspect-[4/3] w-full rounded-[calc(var(--sf-radius-card)-0.375rem)]";
  if (picture?.kind === "illustration") {
    return (
      // `min-h-0` is what makes the aspect box's height definite: by default an aspect-ratio box grows to its content
      // (a tall illustration stretched its panel), and `max-h-full` had nothing to resolve against. Unlike clipping,
      // it leaves overflow visible, so the drawing can be enlarged into the PNG's own transparent margin (~7% a side).
      // The illustration is drawn larger than its box — 14% on the phone, 10% in the tablet/desktop panel — so the
      // artwork, not that margin, fills the card; at those sizes every file's artwork stays inside its card/panel.
      <span className={`relative flex min-h-0 items-center justify-center ${box} ${frame === "panel" ? "bg-blush-soft p-[4%]" : ""}`}>
        <span aria-hidden="true" className={frame === "arch" ? "absolute inset-x-0 top-[2%] aspect-square rounded-full bg-surface/70" : "absolute left-1/2 top-1/2 h-full aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface/70"} />
        <Image
          src={picture.src}
          width={picture.width}
          height={picture.height}
          alt=""
          sizes={sizes}
          className={`relative h-auto max-h-full w-auto max-w-full [clip-path:inset(0_4.5%)] transition-transform duration-[var(--sf-duration-slow)] ease-standard group-active:scale-[1.04] [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.04] ${frame === "arch" ? "[transform:scale(1.14)]" : "[transform:scale(1.1)]"}`}
        />
      </span>
    );
  }
  const contained = picture?.kind === "photo" && picture.image.format === "png";
  return (
    <span className={frame === "arch" ? `relative block overflow-hidden rounded-t-[999px] rounded-b-[0.625rem] bg-panel ring-2 ring-surface ${box}` : `media block ${box}`}>
      {picture ? (
        <Image
          src={picture.image.secureUrl}
          alt=""
          fill
          sizes={sizes}
          className={contained ? "object-contain p-1" : "object-cover transition-transform duration-[var(--sf-duration-slow)] ease-standard group-active:scale-[1.04] [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.04]"}
        />
      ) : null}
    </span>
  );
}
