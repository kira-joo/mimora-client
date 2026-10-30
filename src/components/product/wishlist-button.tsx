"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/session/use-session";
import { useWishlist, useWishlistToggle } from "@/lib/wishlist/use-wishlist";

/**
 * The wishlist toggle, in the card's two placements: `overlay` rides on the
 * photograph on a phone (a 44px hit area holding a 32px chip on the
 * ground-aware canvas surface, so it reads on light and dark photographs), and
 * `row` sits beside Add to cart from tablet up. One state, one handler.
 *
 * `chip` is the home cards' round heart, visible at every width.
 *
 * `labelled` is the product page's: a visible "Save to wishlist" beside the buy
 * box, always shown (card placements hide per breakpoint). Its accessible name
 * IS its visible text, so a voice-control user can say what they read.
 *
 * The wishlist is an account feature: a guest's tap goes to sign-in and comes
 * back here, rather than toggling something that would silently not be saved.
 */
export function WishlistButton({ productId, productName, variant }: { productId: string; productName: string; variant: "overlay" | "row" | "labelled" | "chip" }) {
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const { data: customer } = useSession();
  const { data: wishlist } = useWishlist();
  const toggle = useWishlistToggle();
  const saved = Boolean(wishlist?.items.some((item) => item.productId === productId));
  const label = saved ? t("wishlistRemove", { name: productName }) : t("wishlistAdd", { name: productName });

  function onClick() {
    if (!customer) {
      router.push({ pathname: "/login", query: { redirectTo: pathname } });
      return;
    }
    toggle.mutate({ productId, saved });
  }

  if (variant === "labelled") {
    return (
      <button type="button" onClick={onClick} aria-pressed={saved} className={cn("inline-flex min-h-11 items-center gap-2 self-start text-[0.9375rem] font-medium transition-colors duration-[var(--sf-duration-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus", saved ? "text-action" : "text-ink-secondary hover:text-ink")}>
        <Heart className={cn("size-[18px]", saved && "fill-current")} aria-hidden="true" />
        {saved ? t("wishlistSaved") : t("wishlistSave")}
      </button>
    );
  }
  if (variant === "chip") {
    // The home cards' placement: a round chip on the photograph at every width (a 44px hit area around a 36px chip).
    return (
      <button type="button" onClick={onClick} aria-pressed={saved} aria-label={label} className="group/heart absolute end-1.5 top-1.5 flex size-11 items-center justify-center outline-none">
        <span
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-full bg-chip shadow-card transition-transform duration-[var(--sf-duration-fast)] group-hover/heart:scale-105 group-active/heart:scale-90 group-focus-visible/heart:outline-2 group-focus-visible/heart:outline-offset-2 group-focus-visible/heart:outline-focus",
            saved ? "text-action" : "text-ink-secondary"
          )}
        >
          <Heart className={cn("size-[18px]", saved && "fill-current")} aria-hidden="true" />
        </span>
      </button>
    );
  }
  if (variant === "overlay") {
    return (
      <button type="button" onClick={onClick} aria-pressed={saved} aria-label={label} className="group/heart absolute end-0 top-0 flex size-11 items-start justify-end p-1.5 outline-none md:hidden">
        <span
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-full bg-canvas/90 shadow-card backdrop-blur-sm transition-transform duration-[var(--sf-duration-fast)] group-active/heart:scale-90 group-focus-visible/heart:outline-2 group-focus-visible/heart:outline-offset-2 group-focus-visible/heart:outline-focus",
            saved ? "text-action" : "text-ink"
          )}
        >
          <Heart className={cn("size-4", saved && "fill-current")} aria-hidden="true" />
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      className={cn(
        "inline-flex size-11 flex-none items-center justify-center rounded-[var(--sf-radius-control)] border transition-[border-color,color,transform] duration-[var(--sf-duration-fast)] active:scale-90 max-md:hidden",
        saved ? "border-action text-action" : "border-line-strong text-ink-secondary hover:border-ink hover:text-ink"
      )}
    >
      <Heart className={cn("size-[18px]", saved && "fill-current")} aria-hidden="true" />
    </button>
  );
}
