import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Collection, HomeSection, ImageAsset } from "@/lib/api/types";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/ui/reveal", () => ({ Reveal: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { GiftBand } from "./gift-band";

const L = (ar: string, en: string) => ({ ar, en });
const icon = (name: string): ImageAsset => ({ provider: "cloudinary", publicId: `store/collections/${name}`, secureUrl: `https://res.cloudinary.com/demo/image/upload/v1/store/collections/${name}.png`, format: "png", width: 256, height: 256, bytes: 1 }) as ImageAsset;
const collection = (slug: string, en: string, extra: Partial<Collection> = {}): Collection => ({ _id: slug, slug, name: L(`ع ${en}`, en), ...extra });

function renderBand(collections: Collection[], locale: "ar" | "en" = "en") {
  const [first, ...rest] = collections;
  const section = { type: "editorialBand", headline: L("هدايا لكل مناسبة", "Gifts for every occasion"), collection: { slug: first.slug, name: first.name, ...(first.icon ? { icon: first.icon } : {}) } } as Extract<HomeSection, { type: "editorialBand" }>;
  const { container } = render(<GiftBand section={section} collections={[first, ...rest]} locale={locale} />);
  const [phone, desktop] = container.querySelectorAll("section");
  return { phone, desktop };
}

/** Each occasion's icon, in order: the uploaded picture's URL, or the lucide icon's name. */
const icons = (root: Element) =>
  [...root.querySelectorAll("li")].map((li) => {
    const img = li.querySelector("img");
    if (img) return decodeURIComponent(img.getAttribute("src") ?? "");
    return [...(li.querySelector("svg")?.classList ?? [])].find((c) => c.startsWith("lucide-") && c !== "lucide-icon") ?? "?";
  });

describe("GiftBand — collection icons come from Staff", () => {
  it("renders the icon Staff set on a collection, in both the phone panel and the desktop chips", () => {
    const { phone, desktop } = renderBand([collection("gifts", "Gifts"), collection("birthdays", "Birthdays", { icon: icon("cake-art") }), collection("her", "For her")]);

    expect(icons(phone)[1]).toContain("store/collections/cake-art.png");
    expect(icons(desktop)[0]).toContain("store/collections/cake-art.png");
    const img = phone.querySelector("img")!;
    expect(img.getAttribute("alt")).toBe("");
    expect(img.className).toContain("size-5");
    expect(img.className).toContain("object-contain");
  });

  it("falls back to a default icon for a collection with none — chosen by position, never by slug", () => {
    const a = renderBand([collection("curated-gift-boxes", "Boxes"), collection("birthdays", "Birthdays"), collection("for-her", "For her")]);
    const b = renderBand([collection("x-1", "One"), collection("x-2", "Two"), collection("x-3", "Three")]);

    expect(icons(a.phone)).toEqual(icons(b.phone));
    expect(icons(a.desktop)).toEqual(icons(b.desktop));
    expect(icons(a.phone).every((name) => name.startsWith("lucide-"))).toBe(true);
    expect(a.phone.querySelectorAll("img")).toHaveLength(0);
  });

  it("keeps today's phone panel for collections without icons (gift, cake, party, heart, flower, hands, sparkles)", () => {
    const names = ["a", "b", "c", "d", "e", "f", "g"].map((slug) => collection(slug, slug.toUpperCase()));
    expect(icons(renderBand(names).phone)).toEqual(["lucide-gift", "lucide-cake", "lucide-party-popper", "lucide-heart", "lucide-flower2", "lucide-heart-handshake", "lucide-sparkles"]);
  });

  it("shows each collection's name in the active locale beside its icon", () => {
    const { phone } = renderBand([collection("gifts", "Gifts", { icon: icon("box") }), collection("her", "For her")], "ar");
    expect([...phone.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["ع Gifts", "ع For her"]);
  });
});
