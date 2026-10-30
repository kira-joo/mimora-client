"use client";

import { useCallback } from "react";

/**
 * Declares an element as the viewport's bottom dock — the phone purchase bar, the cart's summary bar. While it is
 * mounted, its rendered height is published as `--sf-dock` on the root, so floating controls (the WhatsApp button)
 * rise above it instead of covering its buttons. A bar hidden by CSS (`lg:hidden`) measures 0 and docks nothing.
 * Returned as a ref callback, so it works on a plain element and on a `motion` element alike.
 */
export function useFloatingDock() {
  return useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => root.style.setProperty("--sf-dock", `${node.offsetHeight}px`));
    observer.observe(node);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--sf-dock");
    };
  }, []);
}
