import Image from "next/image";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import type { Locale, PreviewImage } from "../types";
import { t } from "../format";

interface MediaProps {
  image: PreviewImage | null | undefined;
  locale: Locale;
  /** CSS aspect ratio, e.g. "4 / 5". Ratio-locked so nothing reflows on load (§13). */
  ratio: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
}

/**
 * A photograph in the §12 treatment — radius 0, contained by ring + shadow on
 * the light ground, edge-darkened into the dark ground. Never mirrored in RTL.
 * A missing image renders the designed fallback surface, never a broken icon.
 */
export function Media({ image, locale, ratio, sizes, priority, className, imageClassName }: MediaProps) {
  return (
    <div className={cn("media", className)} style={{ aspectRatio: ratio }}>
      {image ? <Image src={image.src} alt={t(image.alt, locale)} fill sizes={sizes} priority={priority} className={cn("object-cover", imageClassName)} /> : null}
    </div>
  );
}
