"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import Image, { getImageProps, type StaticImageData } from "next/image";
import { preload } from "react-dom";
import { useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Link } from "@/i18n/navigation";
import { directionOf, type Locale } from "@/i18n/routing";
import { autoplayRuns, cellShift, shortestStep, swipeStep, visibleCells, wrapIndex } from "@/lib/home/carousel";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { MOTION } from "@/lib/motion/tokens";

function subscribeVisibility(listener: () => void) {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}

/** Below Tailwind's `md` — where the frame takes the brand banner's portrait version. */
const PHONE = "(max-width: 767px)";

/**
 * One slide: a complete campaign. `artwork` is a finished banner with its own text drawn in — shown whole, never
 * cropped, nothing laid over it, and the whole slide is the link (`href`, named by `label`). `photo` is a photograph
 * with live copy and actions laid over it (`content`); `focus` is its object-position, phone first then md.
 * `mobileImage` is an artwork's portrait version for phones, art-directed by `<picture>`.
 */
export interface CarouselSlide {
  id: string;
  label: string;
  image: StaticImageData;
  mobileImage?: StaticImageData;
  kind: "artwork" | "photo";
  href?: string;
  focus?: string;
  content?: ReactNode;
}

/**
 * The home hero's stage: one complete campaign per slide, across the whole
 * frame. Moving on slides the entire frame to the next campaign — a
 * `translate3d` of each cell, transitioned from the motion tokens, running in
 * the reading direction (so it mirrors in RTL). Copy is real UI inside its own
 * slide, travelling with it; it is never part of a photograph.
 *
 * The frame takes the first slide's own aspect ratio from md, and on a phone the
 * aspect of its portrait version (square when it has none) — so the brand
 * artwork, which carries its own text, fills the frame exactly and is never
 * cropped at any width. Photographs cover the frame.
 *
 * Cells are positioned by one unbounded `position` (lib/home/carousel.ts), so
 * looping from the last slide to the first keeps travelling the same way instead
 * of rewinding across the strip, and a dot several slides away slides there
 * through the ones between. The frame's shape comes from the first image's intrinsic
 * size, known at render: nothing here ever changes it, so there is no layout shift.
 *
 * There is no pause control (owner decision). Autoplay is silent about itself and
 * stops while the pointer is over the hero, focus is inside it, or the tab is
 * hidden; under `prefers-reduced-motion` it never runs and moves are instant.
 * The dots and swipe always work; pagination is three bare dots, the current one a
 * short rose pill, with no container behind them. Only the resting slide
 * is exposed to assistive technology and the tab order (others are `inert`).
 * The first photograph is server-rendered and preloaded; the rest mount after
 * hydration so they never compete with it.
 */
export function HeroCarousel({ slides }: { slides: CarouselSlide[] }) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const rtl = directionOf(locale) === "rtl";
  const reduced = useReducedMotion() ?? false;
  const [position, setPosition] = useState(0);
  const hydrated = useHydrated();
  const [hovering, setHovering] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const tabHidden = useSyncExternalStore(subscribeVisibility, () => document.hidden, () => false);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const count = slides.length;

  const running = autoplayRuns({ count, reducedMotion: reduced, hovering, focusWithin, tabHidden });
  const current = wrapIndex(position, 0, count);

  // One timer per resting slide: it restarts whenever the position changes (including by hand) or a pause condition clears.
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setPosition((at) => at + 1), MOTION.autoplay * 1000);
    return () => window.clearTimeout(timer);
  }, [running, position]);

  const go = useCallback((to: number) => setPosition((at) => at + shortestStep(wrapIndex(at, 0, count), to, count)), [count]);
  const step = useCallback((by: number) => setPosition((at) => at + by), []);

  const cells = hydrated ? visibleCells(position, count) : [0];
  const first = slides[0];
  const phone = first?.mobileImage;
  const frame = first ? ({ "--sf-hero-aspect": `${first.image.width} / ${first.image.height}`, "--sf-hero-aspect-phone": phone ? `${phone.width} / ${phone.height}` : "1 / 1" } as CSSProperties) : undefined;

  return (
    <div
      style={frame}
      className="relative isolate aspect-(--sf-hero-aspect-phone) w-full touch-pan-y select-none overflow-hidden bg-blush md:aspect-(--sf-hero-aspect)"
      onPointerEnter={(event) => event.pointerType === "mouse" && setHovering(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setHovering(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false);
      }}
      onPointerDown={(event) => {
        if (event.pointerType !== "mouse") drag.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        const start = drag.current;
        drag.current = null;
        if (start) step(swipeStep(event.clientX - start.x, event.clientY - start.y, rtl));
      }}
      onPointerCancel={() => (drag.current = null)}
    >
      {count > 0 ? (
        <div role="group" aria-roledescription="carousel" aria-label={t("carouselLabel")} className="absolute inset-0">
          {/* aria-live follows autoplay: silent while rotating by itself, polite once the visitor is steering. */}
          <div aria-live={running ? "off" : "polite"} className="absolute inset-0">
            {cells.map((v) => {
              const i = wrapIndex(v, 0, count);
              const slide = slides[i];
              const active = v === position;
              return (
                <div
                  key={v}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={t("carouselSlide", { n: i + 1, total: count })}
                  inert={!active}
                  style={{ transform: `translate3d(${cellShift(v, position, rtl)}%, 0, 0)` }}
                  className="absolute inset-0 transition-transform duration-[var(--sf-duration-crossfade)] ease-standard will-change-transform motion-reduce:transition-none"
                >
                  {slide.kind === "artwork" ? (
                    <ArtworkSlide slide={slide} first={v === 0} />
                  ) : (
                    <>
                      <Image src={slide.image} alt="" fill draggable={false} sizes="100vw" placeholder="empty" preload={v === 0} loading="eager" fetchPriority={v === 0 ? "high" : "low"} className={cn("object-cover", slide.focus)} />
                      {slide.content}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {count > 1 ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center md:pb-2">
              <div className="pointer-events-auto flex items-center">
                {slides.map((slide, i) => (
                  <button key={slide.id} type="button" onClick={() => go(i)} aria-label={t("carouselGoTo", { n: i + 1, total: count })} aria-current={i === current ? "true" : undefined} className="group/dot inline-flex h-8 min-w-6 items-center justify-center px-1.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-banner-ink">
                    <span className={cn("banner-dot block h-2 rounded-full transition-[width,background-color] duration-[var(--sf-duration-standard)] ease-standard motion-reduce:transition-none", i === current ? "w-5 bg-banner-dot-active" : "w-2 bg-banner-dot group-hover/dot:bg-banner-ink")} />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

    </div>
  );
}

/**
 * The brand banner: the artwork whole, linked as one target. On a phone `<picture>` swaps in its portrait version, and
 * the frame has that version's exact shape (as it has the wide banner's from md), so it fills the frame uncropped at
 * every width. The first banner is preloaded per breakpoint, so a phone never fetches the wide file and vice versa.
 */
function ArtworkSlide({ slide, first }: { slide: CarouselSlide; first: boolean }) {
  const shared = { alt: "", fill: true, sizes: "100vw", draggable: false, loading: "eager", fetchPriority: first ? "high" : "low" } as const;
  const { props: wide } = getImageProps({ ...shared, src: slide.image });
  const { props: narrow } = getImageProps({ ...shared, src: slide.mobileImage ?? slide.image });
  if (first) {
    preload(narrow.src, { as: "image", imageSrcSet: narrow.srcSet, imageSizes: narrow.sizes, fetchPriority: "high", media: slide.mobileImage ? PHONE : undefined });
    if (slide.mobileImage) preload(wide.src, { as: "image", imageSrcSet: wide.srcSet, imageSizes: wide.sizes, fetchPriority: "high", media: "(min-width: 768px)" });
  }
  const image = (
    <picture>
      {slide.mobileImage ? <source media="(min-width: 768px)" srcSet={wide.srcSet} sizes={wide.sizes} /> : null}
      {/* Decorative: the slide's link carries `aria-label`; `shared` already sets `alt: ""`, which the spread hides from the linter. */}
      <img {...narrow} alt="" className="object-cover" />
    </picture>
  );
  if (!slide.href) return image;
  return (
    <Link href={slide.href} aria-label={slide.label} draggable={false} className="absolute inset-0 block focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-banner-ink">
      {image}
    </Link>
  );
}
