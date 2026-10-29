/*
 * Shapes the design preview renders. They mirror the backend's real
 * contracts — `StorefrontContentView` (GET /api/storefront/content),
 * `ProductDetailView` / `MatrixVariant` (GET /api/storefront/products/[slug])
 * — so the preview exercises the layouts the production storefront will feed
 * from real data. Money is a decimal string, as on the wire.
 */

export type Locale = "ar" | "en";

export interface LocalizedString {
  ar: string;
  en: string;
}

export interface PreviewImage {
  src: string;
  alt: LocalizedString;
}

export interface OptionAxis {
  key: string;
  name: LocalizedString;
  /** Display order and labels for this axis's values; `swatch` marks a colour axis. */
  values: Array<{ value: string; label: LocalizedString; swatch?: string; image?: string }>;
}

/** Mirrors `MatrixVariant` — the storefront never sees a stock count, only `purchasable`. */
export interface MatrixVariant {
  variantId: string;
  sku: string;
  optionValues: Array<{ key: string; value: string }>;
  price: string;
  compareAtPrice?: string;
  purchasable: boolean;
  /**
   * NOT IN THE API. The design (§4.1, MDS §6.3) shows an honest "only a few
   * left" signal, but the matrix deliberately carries no stock information —
   * a preview-only flag, raised as a decision in the preview report.
   */
  lowStock?: boolean;
}

export interface SpecRow {
  label: LocalizedString;
  value: LocalizedString;
}

export interface Product {
  slug: string;
  name: LocalizedString;
  description: LocalizedString;
  categorySlug: string;
  collectionSlugs: string[];
  images: PreviewImage[];
  optionAxes: OptionAxis[];
  variants: MatrixVariant[];
  specs: SpecRow[];
  rating?: { average: number; count: number };
  /** For "newest" sorting in the preview. */
  addedAt: string;
}

export interface Category {
  slug: string;
  name: LocalizedString;
  image?: PreviewImage;
}

export interface Collection {
  slug: string;
  name: LocalizedString;
  description: LocalizedString;
  image?: PreviewImage;
}

export type LinkKind = "category" | "collection" | "page";

export interface ResolvedLink {
  kind: LinkKind;
  slug: string;
  label: LocalizedString;
}

export interface ResolvedEntity {
  slug: string;
  name: LocalizedString;
  description?: LocalizedString;
  image?: PreviewImage;
}

/** Mirrors `ResolvedHomeSection` from the backend's storefront-content resolver. */
export type HomeSection =
  | { type: "campaignHero"; headline: LocalizedString; subline?: LocalizedString; action?: { label: LocalizedString; link: ResolvedLink }; image: PreviewImage | null }
  | { type: "collectionStory"; collection: ResolvedEntity; heading?: LocalizedString; body?: LocalizedString }
  | { type: "productRail"; source: "collection" | "newest"; collection?: Pick<ResolvedEntity, "slug" | "name">; heading?: LocalizedString }
  | { type: "categoryTiles"; categories: ResolvedEntity[]; heading?: LocalizedString }
  | { type: "editorialBand"; headline: LocalizedString; collection: ResolvedEntity }
  | { type: "assuranceStrip" };

/** Mirrors `StorefrontContentView`. */
export interface StorefrontContent {
  announcement: { message: LocalizedString; link?: ResolvedLink } | null;
  headerNavigation: ResolvedLink[];
  footerNavigation: ResolvedLink[];
  legalLinks: ResolvedLink[];
  homeSections: HomeSection[];
}

export interface StoreFacts {
  name: LocalizedString;
  tagline: LocalizedString;
  currency: string;
  phone: string;
  deliveryDays: { min: number; max: number };
  returnDays: number;
  deliveryFee: string;
  paymentMethods: Array<{ method: "COD" | "WALLET" | "INSTAPAY"; label: LocalizedString; instructions: LocalizedString }>;
  pickupLocation: { name: LocalizedString; address: LocalizedString };
  governorates: LocalizedString[];
}
