import Image from "next/image";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import type { ImageAsset } from "@/lib/api/types";

interface StoreImageProps {
  image: ImageAsset | null | undefined;
  /** Authored alt text, already resolved to the page locale; "" for decoration (MDS §20). */
  alt: string;
  /** CSS aspect ratio, e.g. "4 / 5" — ratio-locked so nothing reflows on load (MDS §15). */
  ratio: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
}

/**
 * A merchant photograph in the §12 treatment (radius 0, ring + shadow on the
 * light ground, edge-darkened on the dark ground). A missing image renders the
 * designed fallback surface — never a broken icon.
 */
export function StoreImage({ image, alt, ratio, sizes, priority, className, imageClassName }: StoreImageProps) {
  return (
    <div className={cn("media", className)} style={{ aspectRatio: ratio }}>
      {image?.secureUrl ? <Image src={image.secureUrl} alt={alt} fill sizes={sizes} priority={priority} className={cn("object-cover", imageClassName)} /> : null}
    </div>
  );
}
