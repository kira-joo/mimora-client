"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Link } from "@/i18n/navigation";
import { directionOf, type Locale } from "@/i18n/routing";
import { autoplayRuns, swipeStep, wrapIndex } from "@/lib/home/carousel";
import type { HeroSlide } from "@/lib/home/hero-slides";
import { MOTION } from "@/lib/motion/tokens";

const CONTROL = "inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors duration-[var(--sf-duration-fast)] hover:bg-blush-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * The hero's product showcase: slides dissolve into one another (a CSS opacity
 * transition — no layout moves), with real-button dots, previous/next, swipe on
 * touch, and a pause control (WCAG 2.2.2).
 *
 * Autoplay is off under `prefers-reduced-motion` (manual only; the pause control
 * is then hidden, since there is nothing to pause) and pauses while the pointer
 * is over it, focus is inside it, or the tab is hidden. The first slide is
 * server-rendered and preloaded; the others mount after hydration so they never
 * compete with it. Inactive slides are `inert`, so their caption links leave the
 * tab order and the accessibility tree.
 */
export function HeroShowcase({ slides, className }: { slides: HeroSlide[]; className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const rtl = directionOf(locale) === "rtl";
  const reduced = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const count = slides.length;

  const running = autoplayRuns({ count, reducedMotion: reduced, userPaused, hovering, focusWithin, tabHidden });

  useEffect(() => {
    setHydrated(true);
    setTabHidden(document.hidden);
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // One timer per resting slide: it restarts whenever the slide changes (including by hand) or a pause condition clears.
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setIndex((current) => wrapIndex(current, 1, count)), MOTION.autoplay * 1000);
    return () => window.clearTimeout(timer);
  }, [running, index, count]);

  const go = useCallback((next: number) => setIndex(wrapIndex(next, 0, count)), [count]);
  const step = useCallback((by: number) => setIndex((current) => wrapIndex(current, by, count)), [count]);

  if (count === 0) return null;

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={t("carouselLabel")}
      className={cn("relative size-full touch-pan-y select-none", className)}
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
      {/* aria-live follows autoplay: silent while rotating by itself, polite once the visitor is steering. */}
      <div aria-live={running ? "off" : "polite"} className="hero-fade absolute inset-0">
        {slides.map((slide, i) =>
          i === 0 || hydrated ? (
            <div
              key={slide.src}
              role="group"
              aria-roledescription="slide"
              aria-label={t("carouselSlide", { n: i + 1, total: count })}
              inert={i !== index}
              className={cn("absolute inset-0 transition-opacity duration-[var(--sf-duration-crossfade)] ease-standard", i === index ? "opacity-100" : "opacity-0")}
            >
              <Image
                src={slide.src}
                alt=""
                fill
                draggable={false}
                sizes="(min-width: 1024px) 50vw, 100vw"
                preload={i === 0}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "low"}
                className="object-cover"
              />
            </div>
          ) : null
        )}
      </div>

      {/* Captions sit outside the fade so the chip is never masked; each links to a real category or collection. */}
      {slides.map((slide, i) =>
        slide.caption && (i === 0 || hydrated) ? (
          <Link
            key={slide.src}
            href={slide.caption.href}
            aria-hidden={i !== index || undefined}
            tabIndex={i === index ? undefined : -1}
            className={cn(
              "absolute start-3 top-3 inline-flex min-h-11 max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full bg-chip px-4 text-[0.875rem] font-semibold text-ink shadow-card transition-opacity duration-[var(--sf-duration-crossfade)] ease-standard hover:bg-surface md:bottom-5 md:start-5 md:top-auto",
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            <span className="truncate">{slide.caption.label}</span>
            <ArrowLeft className="size-4 flex-none text-action ltr:-scale-x-100" aria-hidden="true" />
          </Link>
        ) : null
      )}

      {count > 1 ? (
        <>
          <button type="button" onClick={() => step(-1)} aria-label={t("carouselPrev")} className={cn(CONTROL, "absolute start-3 top-1/2 hidden -translate-y-1/2 bg-chip shadow-card md:inline-flex")}>
            <ChevronLeft className="size-5 rtl:-scale-x-100" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => step(1)} aria-label={t("carouselNext")} className={cn(CONTROL, "absolute end-3 top-1/2 hidden -translate-y-1/2 bg-chip shadow-card md:inline-flex")}>
            <ChevronRight className="size-5 rtl:-scale-x-100" aria-hidden="true" />
          </button>

          <div className="absolute inset-x-0 bottom-9 mx-auto flex w-fit items-center rounded-full bg-chip px-1 shadow-card md:inset-x-auto md:bottom-5 md:end-5 md:mx-0">
            {/* Nothing to pause when autoplay never runs (reduced motion). */}
            <button type="button" onClick={() => setUserPaused((paused) => !paused)} aria-label={userPaused ? t("carouselPlay") : t("carouselPause")} className={cn(CONTROL, "motion-reduce:hidden")}>
              {userPaused ? <Play className="size-4 fill-current" aria-hidden="true" /> : <Pause className="size-4 fill-current" aria-hidden="true" />}
            </button>
            <div className="flex items-center">
              {slides.map((slide, i) => (
                <button key={slide.src} type="button" onClick={() => go(i)} aria-label={t("carouselGoTo", { n: i + 1, total: count })} aria-current={i === index ? "true" : undefined} className={cn(CONTROL, "group/dot")}>
                  <span className={cn("block h-2.5 rounded-full transition-[width,background-color] duration-[var(--sf-duration-standard)] ease-standard", i === index ? "w-6 bg-action" : "w-2.5 bg-line-strong group-hover/dot:bg-ink-muted")} />
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
