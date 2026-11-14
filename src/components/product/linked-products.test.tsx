import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The locale-aware Link prefixes the active locale; here it is a plain anchor so the product path itself is asserted.
vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a> }));
// eslint-disable-next-line @next/next/no-img-element
vi.mock("next/image", () => ({ default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} /> }));

import { LinkedProducts } from "./linked-products";
import { IncludedProducts } from "./included-products";

const image = (id: string) => ({ provider: "cloudinary", publicId: id, secureUrl: `https://res.cloudinary.com/demo/${id}.jpg` });
afterEach(cleanup);

describe("LinkedProducts", () => {
  const tiles = [
    { slug: "brown-plush-bow-slippers", label: "Brown", name: "Brown Plush Bow Slippers", image: image("brown"), current: false },
    { slug: "pink-plush-bow-slippers", label: "Pink", name: "Pink Plush Bow Slippers", image: image("pink"), current: true },
    { slug: "cream-bow-plush-slippers", label: "Cream", name: "Cream Bow Plush Slippers", image: image("cream"), current: false },
  ];

  it("links every design to its own product page, in order, and names the current one", () => {
    render(<LinkedProducts heading="Design" tiles={tiles} />);
    const nav = screen.getByRole("navigation", { name: "Design" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/products/brown-plush-bow-slippers", "/products/pink-plush-bow-slippers", "/products/cream-bow-plush-slippers"]);
    expect(links.map((link) => link.getAttribute("aria-current"))).toEqual([null, "page", null]);
    expect(nav).toHaveTextContent("Design · Pink");
    expect(links[0]).toHaveAccessibleName("Brown — Brown Plush Bow Slippers");
  });

  it("renders Arabic labels as given", () => {
    render(<LinkedProducts heading="التصميم" tiles={tiles.map((tile, i) => ({ ...tile, label: ["بني", "وردي", "كريمي"][i]! }))} />);
    expect(screen.getByRole("navigation", { name: "التصميم" })).toHaveTextContent("التصميم · وردي");
  });
});

describe("IncludedProducts", () => {

  const cards = [
    { slug: "pink-bow-mug", name: "Pink Bow Mug", quantity: "× 2", images: [image("mug-1"), image("mug-2"), image("mug-3")], imageLabels: [1, 2, 3].map((i) => `Image ${i} of 3: Pink Bow Mug`) },
    { slug: "heart-socks", name: "Heart Socks", images: [image("socks")], imageLabels: ["Image 1 of 1: Heart Socks"] },
  ];

  it("lists each included product with a link to its own page and its quantity when more than one", () => {
    render(<IncludedProducts heading="What's inside?" cards={cards} />);
    const section = screen.getByRole("region", { name: "What's inside?" });
    const items = within(section).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getAllByRole("link").every((link) => link.getAttribute("href") === "/products/pink-bow-mug")).toBe(true);
    expect(items[0]).toHaveTextContent("× 2");
    expect(items[1]).not.toHaveTextContent("×");
  });

  it("browses an item's images in place; a single-image item has no image buttons", () => {
    render(<IncludedProducts heading="What's inside?" cards={cards} />);
    const third = screen.getByRole("button", { name: "Image 3 of 3: Pink Bow Mug" });
    expect(screen.getByRole("img", { name: "Pink Bow Mug" })).toHaveAttribute("src", expect.stringContaining("mug-1"));
    fireEvent.click(third);
    expect(third).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img", { name: "Pink Bow Mug" })).toHaveAttribute("src", expect.stringContaining("mug-3"));
    expect(screen.queryByRole("button", { name: /Heart Socks/ })).toBeNull();
  });
});
