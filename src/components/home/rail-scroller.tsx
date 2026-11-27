"use client";

import { ChevronLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";

/**
 * The horizontal scroller every home product section shares. Touch and trackpad scroll it natively (snap per card);
 * from `lg` up two arrow buttons page it by about one view. RTL-aware: "next" always moves toward the end of the
 * reading direction, and an arrow is disabled at its end. The arrows straddle the rail's edges, over the sliver of the
 * next card, never over a whole one.
 */
export function RailScroller({ children, previousLabel, nextLabel }: { children: ReactNode; previousLabel: string; nextLabel: string }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    // In RTL scrollLeft runs 0 → negative; its magnitude is the distance from the start either way.
    const travelled = Math.abs(list.scrollLeft);
    const room = list.scrollWidth - list.clientWidth;
    const atStart = travelled <= 1;
    const atEnd = travelled >= room - 1;
    // Same values → same object, so a scroll that does not reach an end does not re-render the rail.
    setEdges((previous) => (previous.atStart === atStart && previous.atEnd === atEnd ? previous : { atStart, atEnd }));
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    measure();
    list.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => {
      list.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure]);

  function page(direction: 1 | -1) {
    const list = listRef.current;
    if (!list) return;
    const rtl = getComputedStyle(list).direction === "rtl";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollBy({ left: direction * (rtl ? -1 : 1) * list.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  }

  const arrow = "absolute top-[38%] z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line-strong bg-surface text-ink shadow-sm transition-opacity duration-[var(--sf-duration-fast)] hover:bg-blush-soft disabled:pointer-events-none disabled:opacity-0 lg:flex";

  return (
    <div className="relative">
      <ul
        ref={listRef}
        // `contain: paint` keeps the scrolled-away cards from counting as page overflow (in RTL Chrome counted them).
        className="-mx-[var(--sf-gutter)] flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-[var(--sf-gutter)] px-[var(--sf-gutter)] pb-3 [contain:paint] [scrollbar-width:none] lg:-mx-2 lg:gap-5 lg:scroll-px-2 lg:px-2 lg:pt-1"
      >
        {children}
      </ul>
      <button type="button" aria-label={previousLabel} disabled={edges.atStart} onClick={() => page(-1)} className={cn(arrow, "-start-5")}>
        <ChevronLeft className="size-5 ltr:hidden rtl:-scale-x-100" aria-hidden="true" />
        <ChevronLeft className="size-5 rtl:hidden" aria-hidden="true" />
      </button>
      <button type="button" aria-label={nextLabel} disabled={edges.atEnd} onClick={() => page(1)} className={cn(arrow, "-end-5")}>
        <ChevronLeft className="size-5 ltr:hidden" aria-hidden="true" />
        <ChevronLeft className="size-5 -scale-x-100 rtl:hidden" aria-hidden="true" />
      </button>
    </div>
  );
}
