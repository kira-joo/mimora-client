import type { ImageAsset } from "@/lib/api/types";

export type CategoryPicture =
  | { kind: "illustration"; src: string; width: number; height: number }
  | { kind: "photo"; image: ImageAsset }
  | null;

/**
 * How a category's image from Staff is shown — the one picture of the category on every screen size, managed (and
 * replaced) in Staff → Catalog → Categories, hosted on Cloudinary.
 *
 * A transparent PNG with known dimensions is one of Mimora's category illustrations: it is shown whole, at its own
 * aspect ratio, on the card's pink. Anything else is a photograph and fills the card's frame. No image → nothing:
 * the card keeps its frame and name, and no broken image is rendered.
 */
export function categoryPicture(image: ImageAsset | undefined): CategoryPicture {
  if (!image?.secureUrl) return null;
  if (image.format === "png" && image.width && image.height) return { kind: "illustration", src: image.secureUrl, width: image.width, height: image.height };
  return { kind: "photo", image };
}
