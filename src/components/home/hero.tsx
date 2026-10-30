import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { heroBanners, type HeroBanner } from "@/lib/home/hero-banners";
import { Benefits, type BenefitItem } from "./benefits";
import { HeroCarousel, type CarouselSlide } from "./hero-carousel";

/** The CTA's focus ring sits on light artwork on both grounds, so it takes the banner ink, not the ground's focus hue. */
const ON_BANNER_FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-banner-ink";

/**
 * The home hero: Mimora's three campaigns (lib/home/hero-banners.ts) in one carousel, each a complete slide.
 * The brand banner is finished artwork carrying its own headline and button, so nothing is laid over it — the
 * whole banner is the link, named by the text drawn in it. Banners 2 and 3 are photographs with live, localized
 * copy and a real link over their empty side. The benefits row sits directly under the hero, on the page ground.
 */
export async function CampaignHero({ locale, collectionSlugs, benefits }: { locale: Locale; collectionSlugs: readonly string[]; benefits: BenefitItem[] }) {
  const t = await getTranslations("common");
  const slides: CarouselSlide[] = heroBanners(locale, collectionSlugs).map((banner) =>
    banner.kind === "artwork"
      ? { id: banner.id, kind: "artwork", label: t("heroBrandLabel"), image: banner.image, mobileImage: banner.mobileImage, href: banner.href }
      : { id: banner.id, kind: "photo", label: t(`hero_${banner.id}_title`), image: banner.image, focus: FOCUS[banner.id], content: <BannerCopy banner={banner} title={t(`hero_${banner.id}_title`)} body={t(`hero_${banner.id}_body`)} action={t(`hero_${banner.id}_cta`)} /> },
  );

  return (
    <section aria-label={t("carouselLabel")}>
      <HeroCarousel slides={slides} />
      {benefits.length > 0 ? (
        <div className="container-sf py-6 lg:py-8">
          <Benefits items={benefits} className="mx-auto max-w-3xl" />
        </div>
      ) : null}
    </section>
  );
}

/** Where each photograph is anchored when the frame crops it: the gift box stays in view on a square phone frame. */
const FOCUS: Record<"gifts" | "offers", string> = {
  gifts: "object-[30%_50%] md:object-[50%_50%]",
  offers: "object-[72%_50%] md:object-[50%_50%]",
};

/**
 * Live copy over a photograph's empty side. From md it fills that half of the frame (a physical side — the empty
 * space belongs to the photograph, not the reading direction); on a phone it stacks at the foot of the square frame
 * on a light veil. The ink is the banner ink on both grounds: the artwork is light pink in dark mode too.
 */
function BannerCopy({ banner, title, body, action }: { banner: Extract<HeroBanner, { kind: "photo" }>; title: string; body: string; action: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 z-10 flex md:inset-y-0 md:w-1/2", banner.copySide === "right" ? "md:start-auto md:right-0 md:left-auto" : "md:left-0 md:right-auto")}>
      <div className="banner-veil pointer-events-auto flex w-full flex-col items-center gap-2.5 px-6 pb-16 pt-10 text-center md:justify-center md:gap-4 md:bg-none md:px-[6%] md:pb-0 md:pt-0">
        <h2 className="t-display t-hero text-balance text-banner-ink">{title}</h2>
        <p className="max-w-[28rem] text-balance text-[0.9375rem] leading-relaxed text-banner-ink-muted md:text-[1.0625rem] lg:text-[1.1875rem]">{body}</p>
        <Link href={banner.href} className={`btn btn-primary mt-1 min-h-11 gap-2.5 whitespace-nowrap px-6 text-[0.9375rem] md:min-h-12 lg:mt-2 lg:min-h-14 lg:px-8 lg:text-base ${ON_BANNER_FOCUS}`}>
          {action}
          <ArrowLeft className="size-[18px] ltr:-scale-x-100" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
