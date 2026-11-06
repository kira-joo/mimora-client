import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import enMessages from "@/i18n/locales/en/common.json";
import type { HeaderLink } from "@/lib/chrome/header-links";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => "/",
}));

import { NavDropdown } from "./nav-dropdown";

// jsdom has no PointerEvent, so fireEvent would drop `pointerType` — the very field the hover gate reads.
if (typeof globalThis.PointerEvent === "undefined") {
  class PointerEventShim extends MouseEvent {
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerType = init.pointerType ?? "";
    }
  }
  globalThis.PointerEvent = PointerEventShim as unknown as typeof PointerEvent;
}

const accessories: HeaderLink = {
  key: "category-accessories",
  href: "/categories/accessories",
  label: "Accessories",
  children: [
    { key: "category-jewelry", href: "/categories/jewelry", label: "Jewelry", children: [] },
    { key: "category-hair-accessories", href: "/categories/hair-accessories", label: "Hair Accessories", children: [] },
  ],
};

function renderDropdown() {
  render(
    <NextIntlClientProvider locale="en" messages={{ common: enMessages }}>
      <ul>
        <NavDropdown link={accessories} current={false} linkClassName="" />
      </ul>
    </NextIntlClientProvider>,
  );
  return screen.getByRole("button", { name: "Show Accessories categories" });
}

describe("NavDropdown", () => {
  it("keeps the parent a link to its own page, beside a closed disclosure button", () => {
    const button = renderDropdown();
    expect(screen.getByRole("link", { name: "Accessories" }).getAttribute("href")).toBe("/categories/accessories");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("link", { name: "Jewelry" })).toBeNull();
  });

  it("opens on click to show every sub-category link, and closes on a second click", () => {
    const button = renderDropdown();
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Accessories", "/categories/accessories"],
      ["Jewelry", "/categories/jewelry"],
      ["Hair Accessories", "/categories/hair-accessories"],
    ]);
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes on Escape and returns focus to the button", () => {
    const button = renderDropdown();
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole("link", { name: "Jewelry" }), { key: "Escape" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(button);
  });

  it("opens on a mouse hover but not on a touch's emulated enter", () => {
    const button = renderDropdown();
    const item = button.closest("li")!;
    fireEvent.pointerEnter(item, { pointerType: "touch" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.pointerEnter(item, { pointerType: "mouse" });
    expect(button.getAttribute("aria-expanded")).toBe("true");
    fireEvent.pointerLeave(item, { pointerType: "mouse" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps a hover-opened panel open when the mouse then clicks the chevron; the next click closes it", () => {
    const button = renderDropdown();
    fireEvent.pointerEnter(button.closest("li")!, { pointerType: "mouse" });
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });
});
