import { describe, expect, it } from "vitest";
import type { ImageAsset } from "@/lib/api/types";
import { categoryPicture } from "./category-picture";

const asset = (overrides: Partial<ImageAsset>): ImageAsset => ({ provider: "cloudinary", publicId: "store/categories/x", secureUrl: "https://res.cloudinary.com/x/image/upload/store/categories/x.png", format: "png", width: 323, height: 344, ...overrides });

describe("categoryPicture — a category's image from Staff", () => {
  it("treats a PNG with known dimensions as an illustration, keeping its own size", () => {
    expect(categoryPicture(asset({}))).toEqual({ kind: "illustration", src: asset({}).secureUrl, width: 323, height: 344 });
  });

  it("treats a photograph (or a PNG without dimensions) as a photo for the frame", () => {
    const jpg = asset({ format: "jpg", secureUrl: "https://res.cloudinary.com/x/p.jpg" });
    expect(categoryPicture(jpg)).toEqual({ kind: "photo", image: jpg });
    const unsized = asset({ width: undefined });
    expect(categoryPicture(unsized)).toEqual({ kind: "photo", image: unsized });
  });

  it("has nothing for a category without an image, so no broken image is rendered", () => {
    expect(categoryPicture(undefined)).toBeNull();
    expect(categoryPicture(asset({ secureUrl: "" }))).toBeNull();
  });
});
