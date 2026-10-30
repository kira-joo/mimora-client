"use client";

import Image from "next/image";
import { Check, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Link } from "@/i18n/navigation";
import { Price } from "@/components/ui/price";
import { WishlistButton } from "@/components/product/wishlist-button";
import { useDirectAdd } from "@/lib/cart/use-direct-add";
import { canAddDirectly, type CardProduct } from "@/lib/catalog/card-model";
import { productHref } from "@/lib/links";

/**
 * The home product card: a landscape photograph with a round wishlist heart, name,
 * price, and one full-width action. The name link stretches over the whole card (one
 * tab stop, a large target); the heart and the button sit above it.
 */
export function GiftCard({ product, sizes, priority }: { product: CardProduct; sizes: string; priority?: boolean }) {
  const t = useTranslations("common");
  const { add, busy, justAdded, failed } = useDirectAdd(product);
  const href = productHref(product.slug);
  const direct = canAddDirectly(product);
  const label = failed ? t("addFailed") : justAdded ? t("added") : t("addToCart");

  return (
    <article className="sf-card group relative flex h-full flex-col rounded-card bg-panel p-2.5 pb-3">
      <div className="relative">
        <div className="media aspect-[4/3] rounded-[calc(var(--sf-radius-card)-0.625rem)]">
          {product.images[0] ? (
            <Image
              src={product.images[0].src}
              alt=""
              fill
              sizes={sizes}
              loading={priority ? "eager" : undefined}
              fetchPriority={priority ? "high" : undefined}
              className={cn("object-cover transition-transform duration-[var(--sf-duration-slow)] ease-standard [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03]", product.soldOut && "opacity-70")}
            />
          ) : null}
        </div>
        <div className="relative z-10">
          <WishlistButton productId={product.id} productName={product.name} variant="chip" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-1.5 pt-3">
        <h3 className="text-[1rem] font-semibold leading-snug text-ink">
          <Link href={href} className="line-clamp-2 outline-offset-4 after:absolute after:inset-0 after:rounded-card focus-visible:outline-2 focus-visible:outline-focus">
            {product.name}
          </Link>
        </h3>
        {product.price ? <Price amount={product.price} rangeFrom={product.priceIsRange} compareAt={product.compareAt} /> : null}
      </div>

      <div className="relative z-10 px-1.5 pt-3">
        {product.soldOut ? (
          <span className="btn w-full cursor-not-allowed bg-surface-muted text-ink-muted">{t("outOfStock")}</span>
        ) : direct ? (
          <>
            <button
              type="button"
              onClick={() => void add()}
              // Not disabled while busy — a disabled button loses focus.
              aria-busy={busy || undefined}
              aria-label={`${label} — ${product.name}`}
              className={cn("btn btn-primary w-full gap-2 active:scale-[0.98]", justAdded && "bg-positive hover:bg-positive")}
            >
              {justAdded ? <Check className="size-[18px]" aria-hidden="true" /> : <ShoppingBag className="size-[18px]" aria-hidden="true" />}
              <span aria-hidden="true">{label}</span>
            </button>
            <span className="sr-only" role="status">
              {failed ? t("addFailed") : justAdded ? t("added") : ""}
            </span>
          </>
        ) : (
          <Link href={href} className="btn btn-outline w-full" aria-label={`${t("chooseOptionsLong")} — ${product.name}`}>
            {t("chooseOptionsLong")}
          </Link>
        )}
      </div>
    </article>
  );
}
