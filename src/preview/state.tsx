"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import type { PreviewCartLine } from "./mock-api/quote";

/*
 * Preview-only client state: the cart lines, and the "just added" line the
 * confirmation sheet shows. Persisted per tab in sessionStorage — wrapped in
 * try/catch, because storage throws outright in a private window with site
 * data blocked (design-system.md §8). In production the cart lives on the
 * server behind this app's own route handlers; nothing here survives into it.
 */

const STORAGE_KEY = "sf-preview-cart";
const WISHLIST_KEY = "sf-preview-wishlist";

interface PreviewState {
  lines: PreviewCartLine[];
  lastAdded: PreviewCartLine | null;
  addLine(productSlug: string, variantId: string, quantity: number): void;
  setQuantity(lineId: string, quantity: number): void;
  removeLine(lineId: string): void;
  clearLastAdded(): void;
  clearCart(): void;
  /** Saved product slugs. In production: GET/POST/DELETE /api/shop/wishlist (already in the backend). */
  wishlist: string[];
  toggleWishlist(slug: string): void;
}

const Context = createContext<PreviewState | null>(null);

const SEED: PreviewCartLine[] = [
  { lineId: "line-seed-1", productSlug: "washed-linen-shirt", variantId: "LSH-0", quantity: 1 },
  { lineId: "line-seed-2", productSlug: "bench-chisel-set", variantId: "CHS-0", quantity: 1 },
  // Sold out since it was added — shows the "no longer purchasable" line state.
  { lineId: "line-seed-3", productSlug: "forest-hatchet", variantId: "HTC-0", quantity: 1 },
];

export function PreviewStateProvider({ children }: { children: ReactNode }) {
  // Seeded so Cart and Checkout can be reviewed directly, without shopping first.
  const [lines, setLines] = useState<PreviewCartLine[]>(SEED);
  const [lastAdded, setLastAdded] = useState<PreviewCartLine | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Saving waits until the stored cart has been read — otherwise the first save writes the seed over it.
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (stored) setLines(JSON.parse(stored) as PreviewCartLine[]);
      const saved = window.sessionStorage.getItem(WISHLIST_KEY);
      if (saved) setWishlist(JSON.parse(saved) as string[]);
    } catch {
      // Storage unavailable — the seeded cart stands.
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
      window.sessionStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
    } catch {
      // Storage unavailable — state lives for this page only.
    }
  }, [lines, wishlist, restored]);

  // State updaters stay pure: the next lines are computed from a ref, then both states are set.
  const linesRef = useRef(lines);
  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  const addLine = useCallback((productSlug: string, variantId: string, quantity: number) => {
    const current = linesRef.current;
    // Lines merge on variantId (MDS §11); the line id is otherwise opaque and server-issued.
    const existing = current.find((line) => line.variantId === variantId);
    const next = existing
      ? current.map((line) => (line === existing ? { ...line, quantity: line.quantity + quantity } : line))
      : [...current, { lineId: `line-${Date.now()}`, productSlug, variantId, quantity }];
    linesRef.current = next;
    setLines(next);
    setLastAdded(next.find((line) => line.variantId === variantId) ?? null);
  }, []);

  const value = useMemo<PreviewState>(
    () => ({
      lines,
      lastAdded,
      addLine,
      setQuantity: (lineId, quantity) => setLines((current) => current.map((line) => (line.lineId === lineId ? { ...line, quantity: Math.max(1, quantity) } : line))),
      removeLine: (lineId) => setLines((current) => current.filter((line) => line.lineId !== lineId)),
      clearLastAdded: () => setLastAdded(null),
      clearCart: () => setLines([]),
      wishlist,
      toggleWishlist: (slug) => setWishlist((current) => (current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug])),
    }),
    [lines, lastAdded, addLine, wishlist]
  );

  // reducedMotion="user": Motion drops transforms for visitors who ask for less motion (§14).
  return (
    <MotionConfig reducedMotion="user">
      <Context.Provider value={value}>{children}</Context.Provider>
    </MotionConfig>
  );
}

export function usePreviewState(): PreviewState {
  const value = useContext(Context);
  if (!value) throw new Error("usePreviewState must be used inside PreviewStateProvider");
  return value;
}
