"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The category rail's scroll container: it scrolls the chosen category into
 * view when the page opens or the choice changes, so a selection past the edge
 * of a phone is never hidden. Works in either writing direction — it asks the
 * browser to centre the element rather than computing a scroll offset.
 */
export function RailScroller({ activeKey, className, children }: { activeKey: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const active = ref.current?.querySelector<HTMLElement>("[aria-current]");
    if (!active || !ref.current) return;
    const rail = ref.current.getBoundingClientRect();
    const item = active.getBoundingClientRect();
    if (item.left >= rail.left && item.right <= rail.right) return;
    active.scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" });
  }, [activeKey]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
