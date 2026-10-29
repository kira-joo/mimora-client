"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ImageAsset } from "@/lib/api/types";

/**
 * The only client-only cart state: what was JUST added, so the "Added to your
 * cart" sheet can show it (design-system §13b). Everything else about the cart
 * is server state (React Query over /api/session/cart) — the client never keeps
 * its own copy of lines or totals (MDS §11: totals are never stored).
 */
export interface AddedLine {
  productSlug: string;
  productName: string;
  /** "Olive · M" — the option labels as the customer chose them. */
  optionLabel: string;
  image: ImageAsset | null;
  /** The variant's catalog price, for display in the sheet; the cart quotes the authoritative total. */
  price: string;
}

interface CartUi {
  lastAdded: AddedLine | null;
  announceAdded(line: AddedLine): void;
  clearLastAdded(): void;
}

const Context = createContext<CartUi | null>(null);

export function CartUiProvider({ children }: { children: ReactNode }) {
  const [lastAdded, setLastAdded] = useState<AddedLine | null>(null);
  const announceAdded = useCallback((line: AddedLine) => setLastAdded(line), []);
  const clearLastAdded = useCallback(() => setLastAdded(null), []);
  const value = useMemo(() => ({ lastAdded, announceAdded, clearLastAdded }), [lastAdded, announceAdded, clearLastAdded]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCartUi(): CartUi {
  const value = useContext(Context);
  if (!value) throw new Error("useCartUi must be used inside CartUiProvider");
  return value;
}
