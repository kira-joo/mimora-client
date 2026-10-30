import { ArrowLeft, Gift } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { HomeSection } from "@/lib/api/types";
import { localized } from "@/lib/format/numerals";
import type { HeroSlide } from "@/lib/home/hero-slides";
import { linkHref } from "@/lib/links";
import { Benefits, type BenefitItem } from "./benefits";
import { HeroShowcase } from "./hero-showcase";
import { HandHeart } from "./ornaments";

/** A headline authored as sentences ("Little things. Big feelings.") breaks between them; other scripts' marks are honoured. */
const SENTENCE_BREAK = /(?<=[.!?؟。])\s+/u;

/**
 * Campaign hero. Copy, the primary action and the benefits are real page content
 * (not part of any photograph); the right-hand showcase is a rotation of the
 * store's own photographs. One DOM order serves both layouts — copy, showcase,
 * benefits — which stacks on a phone and, from `lg`, puts the showcase beside
 * the copy, bleeding to the reading-end edge of the viewport.
 */
export function CampaignHero({ section, locale, slides, secondary, benefits }: { section: Extract<HomeSection, { type: "campaignHero" }>; locale: Locale; slides: HeroSlide[]; secondary: { label: string; href: string } | null; benefits: BenefitItem[] }) {
  const headline = localized(section.headline, locale);
  const subline = section.subline ? localized(section.subline, locale) : "";
  const lines = headline.split(SENTENCE_BREAK);

  return (
    <section className="relative isolate overflow-hidden lg:flex lg:min-h-[clamp(520px,41.4vw,640px)] lg:flex-col lg:justify-center">
      <div className="hero-glow absolute inset-0 -z-10" aria-hidden="true" />
      <HandHeart className="absolute start-[3%] top-6 hidden size-9 -rotate-6 text-ornament lg:block" />
      <HandHeart className="absolute start-[42%] top-[4%] size-6 rotate-12 text-ornament max-lg:hidden" />
      <HandHeart className="absolute end-6 top-10 size-7 rotate-6 text-ornament lg:hidden" />

      <div className="container-sf pointer-events-none relative z-10 pb-6 pt-8 text-center lg:pb-0 lg:pt-10 lg:text-start">
        <div className="pointer-events-auto mx-auto flex max-w-xl flex-col items-center gap-4 lg:mx-0 lg:max-w-[min(36rem,50%)] lg:items-start lg:gap-5">
          <h1 className="t-display text-balance">
            {lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          {subline ? <p className="max-w-md font-display text-[1.125rem] leading-relaxed text-ink-muted lg:text-[1.5rem]">{subline}</p> : null}
          <div className="mt-2 flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center lg:mt-3 lg:justify-start">
            {section.action ? (
              <Link href={linkHref(section.action.link)} className="btn btn-primary min-h-12 gap-2.5 whitespace-nowrap px-7 text-base lg:min-h-14 xl:px-9">
                {localized(section.action.label, locale)}
                <ArrowLeft className="size-[18px] ltr:-scale-x-100" aria-hidden="true" />
              </Link>
            ) : null}
            {secondary ? (
              <Link href={secondary.href} className="btn btn-outline min-h-12 gap-2.5 whitespace-nowrap px-7 text-base lg:min-h-14 xl:px-8">
                <Gift className="size-[18px]" aria-hidden="true" />
                {secondary.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {slides.length > 0 ? (
        <div className="relative aspect-[5/4] w-full sm:aspect-[16/10] lg:absolute lg:inset-y-0 lg:end-0 lg:z-0 lg:aspect-auto lg:w-[50%]">
          <HeroShowcase slides={slides} />
        </div>
      ) : null}

      {benefits.length > 0 ? (
        <div className="container-sf pointer-events-none relative z-10 -mt-6 rounded-t-panel bg-canvas pb-2 pt-6 lg:mt-0 lg:rounded-none lg:bg-transparent lg:pb-12 lg:pt-8">
          <Benefits items={benefits} className="pointer-events-auto lg:max-w-[34rem]" />
        </div>
      ) : null}
    </section>
  );
}
