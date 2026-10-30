import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/i18n/locales/en/common.json";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/session/use-session", () => ({ useSession: () => ({ data: { id: "c1" } }) }));

let savedIds: string[] = [];
vi.mock("@/lib/wishlist/use-wishlist", () => ({
  useWishlist: () => ({ data: { items: savedIds.map((productId) => ({ productId })) } }),
  useWishlistToggle: () => ({ mutate: vi.fn() }),
}));

import { WishlistButton } from "./wishlist-button";

function mount(variant: "overlay" | "row" | "labelled" | "chip") {
  return render(
    <NextIntlClientProvider locale="en" messages={{ common: en }}>
      <WishlistButton productId="p1" productName="Lamp" variant={variant} />
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  savedIds = [];
});
afterEach(cleanup);

describe("WishlistButton aria-pressed", () => {
  it.each(["overlay", "row", "labelled", "chip"] as const)("%s reflects the unsaved and saved state", (variant) => {
    mount(variant);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
    cleanup();
    savedIds = ["p1"];
    mount(variant);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("labelled keeps its visible text as the accessible name in both states", () => {
    mount("labelled");
    expect(screen.getByRole("button", { name: en.wishlistSave })).toBeInTheDocument();
    cleanup();
    savedIds = ["p1"];
    mount("labelled");
    expect(screen.getByRole("button", { name: en.wishlistSaved })).toBeInTheDocument();
  });

  it("icon variants name the product", () => {
    mount("row");
    expect(screen.getByRole("button", { name: "Save Lamp to your wishlist" })).toBeInTheDocument();
  });
});
