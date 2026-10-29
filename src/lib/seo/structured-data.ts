import type { Locale } from "@/i18n/routing";
import type { Crumb } from "@/lib/catalog/breadcrumbs";

/*
 * Structured data (MDS §21), as PURE builders: data in, a plain object out, no
 * I/O and no React — so the shapes are unit-tested, and a field that cannot be
 * stated truthfully is omitted rather than emitted as `undefined` or a guess.
 * The origin is this deployment's own (SITE_URL); without it nothing absolute
 * can be said, and the builders leave out what needs it.
 */
type Json = Record<string, unknown>;

/** `{origin}/{locale}{path}`, or null when the deployment has no origin configured. */
export function absoluteUrl(origin: string | null, locale: Locale, path: string): string | null {
  if (!origin) return null;
  return `${origin.replace(/\/$/, "")}/${locale}${path === "/" ? "" : path}`;
}

/** Drops keys that are `undefined`, `null` or an empty string/array — JSON-LD with `"x": undefined` is simply wrong. */
function compact(value: Json): Json {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== "" && !(Array.isArray(entry) && entry.length === 0)));
}

/** BreadcrumbList from the same trail the page shows. The current page (no href) takes the page's own URL; without an origin there is nothing to say. */
export function breadcrumbListJsonLd(trail: Crumb[], opts: { origin: string | null; locale: Locale; currentPath: string }): Json | null {
  const items = trail.map((crumb) => ({ name: crumb.label, url: absoluteUrl(opts.origin, opts.locale, crumb.href ?? opts.currentPath) }));
  if (items.length === 0 || items.some((item) => item.url === null || !item.name)) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: item.url })),
  };
}

export interface StoreJsonLdInput {
  origin: string | null;
  locale: Locale;
  name: string;
  description?: string;
  logoUrl?: string;
  imageUrl?: string;
  phone?: string;
  email?: string;
  socialUrls?: string[];
  /** ISO 4217, from the store profile. */
  currency?: string;
}

/** The store itself — an `OnlineStore`, from the store profile. Needs the origin for its `url`; without one it is not emitted. */
export function storeJsonLd(input: StoreJsonLdInput): Json | null {
  const url = absoluteUrl(input.origin, input.locale, "/");
  if (!url || !input.name) return null;
  return compact({
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: input.name,
    url,
    description: input.description,
    logo: input.logoUrl,
    image: input.imageUrl ?? input.logoUrl,
    telephone: input.phone,
    email: input.email,
    sameAs: input.socialUrls,
    currenciesAccepted: input.currency,
  });
}

const SCHEMA = "https://schema.org";

export interface OfferVariant {
  variantId: string;
  sku: string;
  price: string;
  purchasable: boolean;
  /** CONTINUE_SELLING with nothing on hand. */
  onBackorder: boolean;
}

/** InStock / BackOrder / OutOfStock — a backordered variant is orderable, but it is not in stock and must not say so. */
export function offerAvailability(variant: Pick<OfferVariant, "purchasable" | "onBackorder">): string {
  if (!variant.purchasable) return `${SCHEMA}/OutOfStock`;
  return variant.onBackorder ? `${SCHEMA}/BackOrder` : `${SCHEMA}/InStock`;
}

export interface ProductJsonLdInput {
  name: string;
  description?: string;
  imageUrls: string[];
  brandName?: string;
  rating?: { average: number; count: number };
  variants: OfferVariant[];
  /** The store's currency — when unknown, there are NO offers: a price without a currency is not a price. */
  currency?: string;
  /** The product's absolute URL, when the deployment has an origin. */
  url: string | null;
}

/**
 * Product with one Offer per variant. Every offer states its own `sku`,
 * `price`, `priceCurrency`, `availability` and the product `url` — the page has
 * no per-variant URL (selection is in-page state), so each variant's offer
 * points at the product page rather than inventing a parameter nothing reads.
 * Availability is the CACHED view; the buy box is the live one.
 */
export function productJsonLd(input: ProductJsonLdInput): Json {
  const currency = input.currency?.trim();
  const offers = currency
    ? input.variants
        .filter((variant) => variant.price !== "")
        .map((variant) =>
          compact({
            "@type": "Offer",
            sku: variant.sku,
            url: input.url ?? undefined,
            price: variant.price,
            priceCurrency: currency,
            availability: offerAvailability(variant),
          })
        )
    : [];
  return compact({
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    image: input.imageUrls,
    url: input.url ?? undefined,
    brand: input.brandName ? { "@type": "Brand", name: input.brandName } : undefined,
    aggregateRating: input.rating && input.rating.count > 0 ? { "@type": "AggregateRating", ratingValue: input.rating.average, reviewCount: input.rating.count } : undefined,
    offers,
  });
}

const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), "g");
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), "g");

/** JSON for a `<script type="application/ld+json">`: `<` and the two JS line terminators escaped so no value can close the tag or break the script. */
export function serializeJsonLd(data: Json): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(LINE_SEPARATOR, "\\u2028").replace(PARAGRAPH_SEPARATOR, "\\u2029");
}
