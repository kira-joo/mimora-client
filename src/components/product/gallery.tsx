"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { formatNumber } from "@/lib/format/numerals";
import type { Locale } from "@/i18n/routing";
import { MOTION } from "@/lib/motion/tokens";

export interface GalleryImage {
  src: string;
  alt: string;
  /** width / height of the stored image, when known. */
  ratio?: number;
}

/** The frame follows the product's first photograph, kept between these so a very tall or very wide one stays sensible. */
const FRAME_MIN = 4 / 5;
const FRAME_MAX = 16 / 9;

/** The frame's aspect ratio: the first image's own shape, clamped; 4 / 5 when no image says. */
export function frameRatio(images: readonly GalleryImage[]): number {
  const ratio = images[0]?.ratio;
  if (!ratio || !Number.isFinite(ratio) || ratio <= 0) return FRAME_MIN;
  return Math.min(FRAME_MAX, Math.max(FRAME_MIN, ratio));
}

/**
 * Phone: a swipeable strip with a position indicator that never hijacks
 * vertical scroll (MDS §16). Desktop: the large image with a thumbnail rail;
 * the thumbnails' ORDER follows the reading direction while each photograph is
 * never mirrored. Image changes crossfade (§14), or simply change under
 * reduced motion.
 *
 * Every photograph is shown WHOLE (`object-contain`): a gift box's composition is the product, and cropping it to a
 * fixed portrait frame cut items off. The frame takes the first photograph's own aspect ratio (`frameRatio`, clamped
 * to 4:5–16:9 — never taller than the old 4:5 frame), so a photo within that range fills it exactly with no empty
 * space, and one outside it fits whole with slim margins. One frame for every slide keeps the swipe strip from
 * jumping in height. Thumbnails stay cropped squares-ish previews (`object-cover`): they only point at a photo.
 */
export function Gallery({ images }: { images: GalleryImage[] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];
  const aspectRatio = String(frameRatio(images));

  if (images.length === 0) return <div className="media" style={{ aspectRatio: "4 / 5" }} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative -mx-[var(--sf-gutter)] lg:hidden">
        <ul
          // Focusable so a keyboard can scroll the strip with the arrow keys (WCAG 2.1.1 — measured by axe).
          tabIndex={0}
          className="flex snap-x snap-mandatory overflow-x-auto outline-offset-[-3px] [contain:paint] [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-focus"
          aria-label={t("gallery")}
          onScroll={(event) => {
            const el = event.currentTarget;
            setIndex(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
          }}
        >
          {images.map((image, i) => (
            <li key={image.src} className="w-full flex-none snap-center" aria-label={t("imageOf", { i: formatNumber(locale, i + 1), n: formatNumber(locale, images.length) })}>
              <div className="media" style={{ aspectRatio }}>
                <Image src={image.src} alt={image.alt} fill priority={i === 0} sizes="100vw" className="object-contain" />
              </div>
            </li>
          ))}
        </ul>
        {images.length > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden="true">
            {images.map((image, i) => (
              <span key={image.src} className={cn("h-1.5 rounded-full bg-on-media transition-[width,opacity] duration-[var(--sf-duration-standard)]", i === index ? "w-5 opacity-100" : "w-1.5 opacity-60")} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="hidden lg:flex lg:flex-col lg:gap-3">
        <div className="media" style={{ aspectRatio }}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div key={current?.src} className="absolute inset-0" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: MOTION.standard, ease: MOTION.easeStandard }}>
              {current ? <Image src={current.src} alt={current.alt} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-contain" /> : null}
            </motion.div>
          </AnimatePresence>
        </div>
        {images.length > 1 ? (
          <ul className="flex gap-3" aria-label={t("gallery")}>
            {images.map((image, i) => (
              <li key={image.src} className="w-20">
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={t("imageOf", { i: formatNumber(locale, i + 1), n: formatNumber(locale, images.length) })}
                  aria-current={i === index || undefined}
                  className={cn("media block w-full outline-offset-2", i === index && "outline-2 outline-ink outline")}
                  style={{ aspectRatio: "4 / 5" }}
                >
                  <Image src={image.src} alt="" fill sizes="80px" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
