import { act, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StaticImageData } from "next/image";
import enMessages from "@/i18n/locales/en/common.json";
import { MOTION } from "@/lib/motion/tokens";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { HeroCarousel, type CarouselSlide } from "./hero-carousel";

const image = { src: "/hero.png", width: 1600, height: 600 } as StaticImageData;
const slides: CarouselSlide[] = ["a", "b", "c"].map((id) => ({ id, label: id, image, kind: "photo" as const }));
const AUTOPLAY_MS = MOTION.autoplay * 1000;

function renderCarousel() {
  render(
    <NextIntlClientProvider locale="en" messages={{ common: enMessages }}>
      <HeroCarousel slides={slides} />
    </NextIntlClientProvider>,
  );
}

/** The 1-based slide number whose dot is current. */
const current = () => {
  const dots = screen.getAllByRole("button", { name: /^Go to slide/ });
  return dots.findIndex((dot) => dot.getAttribute("aria-current") === "true") + 1;
};

function setTabHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  // Remove the own-property override so `document.hidden` is the prototype's again.
  Reflect.deleteProperty(document, "hidden");
});

describe("HeroCarousel autoplay", () => {
  it("advances one slide per rest interval, wrapping around", () => {
    renderCarousel();
    expect(current()).toBe(1);

    act(() => void vi.advanceTimersByTime(AUTOPLAY_MS));
    expect(current()).toBe(2);
    act(() => void vi.advanceTimersByTime(AUTOPLAY_MS));
    expect(current()).toBe(3);
    act(() => void vi.advanceTimersByTime(AUTOPLAY_MS));
    expect(current()).toBe(1);
  });

  it("stops while the tab is hidden and resumes when it is visible again", () => {
    renderCarousel();
    act(() => void vi.advanceTimersByTime(AUTOPLAY_MS));
    expect(current()).toBe(2);

    setTabHidden(true);
    act(() => void vi.advanceTimersByTime(AUTOPLAY_MS * 5));
    expect(current()).toBe(2);

    setTabHidden(false);
    act(() => void vi.advanceTimersByTime(AUTOPLAY_MS));
    expect(current()).toBe(3);
  });

  it("a hidden tab pre-empts a timer already running for the current slide", () => {
    renderCarousel();
    act(() => void vi.advanceTimersByTime(AUTOPLAY_MS - 100));
    setTabHidden(true);
    act(() => void vi.advanceTimersByTime(1000));
    expect(current()).toBe(1);
  });
});
