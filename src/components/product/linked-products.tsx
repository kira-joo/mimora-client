import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { StoreImage } from "@/components/ui/store-image";
import { Link } from "@/i18n/navigation";
import type { ImageAsset } from "@/lib/api/types";
import { productHref } from "@/lib/links";

export interface LinkedProductTile {
  slug: string;
  /** Already localized. */
  label: string;
  /** Already localized — the product's own name, for assistive technology. */
  name: string;
  image?: ImageAsset;
  current: boolean;
}

/**
 * The other colours or designs of this item, each its own product: choosing one opens that product's page. Links,
 * not toggles — so the current one is `aria-current="page"`, and the tile styling mirrors the variant selector's
 * chosen state so the two read as one vocabulary. Colour is never the only signal: the chosen label is spelled out.
 */
export function LinkedProducts({ heading, tiles }: { heading: string; tiles: LinkedProductTile[] }) {
  const current = tiles.find((tile) => tile.current);
  return (
    <nav aria-label={heading} className="flex flex-col gap-3">
      <p className="text-[0.9375rem]">
        <span className="font-semibold">{heading}</span>
        {current ? <span className="text-ink-secondary"> · {current.label}</span> : null}
      </p>
      <ul className="flex flex-wrap gap-2">
        {tiles.map((tile) => (
          <li key={tile.slug} className="flex">
            <Link
              href={productHref(tile.slug)}
              aria-current={tile.current ? "page" : undefined}
              aria-label={tile.label === tile.name ? tile.name : `${tile.label} — ${tile.name}`}
              className={cn(
                "flex w-[4.75rem] flex-col items-center justify-start gap-1.5 rounded-[var(--sf-radius-control)] border p-1.5 text-center transition-[border-color,box-shadow] duration-[var(--sf-duration-fast)] ease-standard",
                tile.current ? "border-ink shadow-[inset_0_0_0_1px_var(--sf-ink)]" : "border-line-strong hover:border-ink"
              )}
            >
              <StoreImage image={tile.image} alt="" ratio="1 / 1" sizes="64px" className="w-full overflow-hidden rounded-[calc(var(--sf-radius-control)-2px)]" />
              <span className={cn("line-clamp-2 text-[0.8125rem] leading-tight", tile.current ? "font-semibold text-ink" : "text-ink-secondary")}>{tile.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
