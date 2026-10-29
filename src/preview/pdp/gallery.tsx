"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { formatNumber, t } from "../format";
import { getDictionary } from "../i18n";
import type { Locale, PreviewImage } from "../types";

/**
 * Phone: a swipeable strip with a position indicator that never hijacks
 * vertical scroll (§13b). Desktop: the large image with a thumbnail rail; the
 * thumbnails' ORDER follows the reading direction while each photograph is
 * never mirrored (§9). Image changes crossfade (§14 "Gallery change").
 */
export function Gallery({ images, locale, activeSrc }: { images: PreviewImage[]; locale: Locale; activeSrc?: string }) {
  const dict = getDictionary(locale);
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const strip = useRef<HTMLUListElement>(null);

  // A colour with its own photograph swaps the gallery to it (MDS §10.5).
  useEffect(() => {
    if (!activeSrc) return;
    const found = images.findIndex((image) => image.src === activeSrc);
    if (found >= 0) setIndex(found);
  }, [activeSrc, images]);

  const current = images[index] ?? images[0];

  return (
    <div className="flex flex-col gap-3">
      {/* Phone strip */}
      <div className="relative -mx-[var(--sf-gutter)] lg:hidden">
        <ul
          ref={strip}
          className="flex snap-x snap-mandatory overflow-x-auto [contain:paint] [scrollbar-width:none]"
          aria-label={dict.gallery}
          onScroll={(event) => {
            const el = event.currentTarget;
            setIndex(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
          }}
        >
          {images.map((image, i) => (
            <li key={image.src} className="w-full flex-none snap-center" aria-label={dict.imageOf(formatNumber(locale, i + 1), formatNumber(locale, images.length))}>
              <div className="media" style={{ aspectRatio: "4 / 5" }}>
                <Image src={image.src} alt={t(image.alt, locale)} fill priority={i === 0} sizes="100vw" className="object-cover" />
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

      {/* Desktop */}
      <div className="hidden lg:flex lg:flex-col lg:gap-3">
        <div className="media" style={{ aspectRatio: "4 / 5" }}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={current?.src}
              className="absolute inset-0"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
            >
              {current ? <Image src={current.src} alt={t(current.alt, locale)} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" /> : null}
            </motion.div>
          </AnimatePresence>
        </div>
        {images.length > 1 ? (
          <ul className="flex gap-3" aria-label={dict.gallery}>
            {images.map((image, i) => (
              <li key={image.src} className="w-20">
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={dict.imageOf(formatNumber(locale, i + 1), formatNumber(locale, images.length))}
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
