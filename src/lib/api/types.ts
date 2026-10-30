import type { LocalizedString } from "@kira-joo/toolkit-common";

/*
 * The storefront's copy of the backend contract (mimora-staff owns every
 * shape; its `storefront.endpoints.ts` says consumers hand-maintain their own).
 * Money is a STRING on the wire and is never arithmetic here — it is only ever
 * formatted (MDS §24). Dates are ISO strings, ids hex strings.
 */
export type Money = string;
export type Localized = LocalizedString;

export interface ImageAsset {
  provider: string;
  publicId: string;
  secureUrl: string;
  format?: string;
  width?: number;
  height?: number;
  placeholderUrl?: string;
  /** Present on product images — authored in the backoffice (MDS §20). */
  alt?: Localized;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------- store configuration

export interface StoreProfile {
  _id: string;
  name: Localized;
  tagline?: Localized;
  description?: Localized;
  logo?: ImageAsset;
  favicon?: ImageAsset;
  ogImage?: ImageAsset;
  heroMedia?: ImageAsset;
  contact: { phone?: string; email?: string; whatsApp?: string };
  socialLinks: Array<{ platform: string; url: string }>;
  currency: string;
  defaultLocale: "ar" | "en";
  supportedLocales: string[];
  defaultSeo?: { title?: Localized; description?: Localized };
}

export interface ResolvedFill {
  hex: string;
  contrastRatio: number;
  source: "override" | "derived";
}

export interface ThemeView {
  brand: { primary: string; accent: string; radiusScale?: number };
  theme: { defaultGround: "light" | "dark"; darkEnabled: boolean; allowVisitorChoice: boolean };
  palette: Record<"light" | "dark", Record<"primary" | "accent", ResolvedFill>>;
  grounds: { light: string; dark: string };
}

export interface ResolvedLink {
  kind: "category" | "collection" | "page";
  slug: string;
  label: Localized;
}

export interface ResolvedEntity {
  slug: string;
  name: Localized;
  description?: Localized;
  image?: ImageAsset;
}

/** mimora-staff `ResolvedHomeSection` (content/resolve-storefront-content.ts). Unresolvable sections never arrive. */
export type HomeSection =
  | { type: "campaignHero"; headline: Localized; subline?: Localized; action?: { label: Localized; link: ResolvedLink }; image: ImageAsset | null }
  | { type: "collectionStory"; collection: ResolvedEntity; heading?: Localized; body?: Localized }
  | { type: "productRail"; source: "collection" | "newest"; collection?: Pick<ResolvedEntity, "slug" | "name">; heading?: Localized }
  | { type: "categoryTiles"; categories: ResolvedEntity[]; heading?: Localized }
  | { type: "editorialBand"; headline: Localized; collection: ResolvedEntity }
  | { type: "assuranceStrip" };

export interface StorefrontContent {
  announcement: { message: Localized; link?: ResolvedLink } | null;
  announcementChangesAt: string | null;
  headerNavigation: ResolvedLink[];
  footerNavigation: ResolvedLink[];
  legalLinks: ResolvedLink[];
  homeSections: HomeSection[];
  publishedAt: string | null;
}

export interface FulfilmentSettings {
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  defaultDispatchLeadDays: number;
  cutoffTime?: string;
  maxDaysAhead: number;
  orderMinimum?: Money;
  shippingFeeMode: "FLAT" | "BY_ZONE";
  flatShippingFee?: Money;
  allowGuestCheckout: boolean;
  tax: { mode: "INCLUDED" | "ADDED"; rate: number };
  customerCancelWindowMinutes: number;
  returnWindowDays: number;
}

export interface PaymentMethodView {
  method: string;
  order: number;
  instructions?: Localized;
  destination?: { accountName?: string; number?: string; handle?: string };
  requiresProof: boolean;
}

export interface DeliveryZone {
  _id: string;
  name: Localized;
  areas: string[];
  fee: Money;
  minimumOrder?: Money;
  leadDays: number;
  order: number;
}

export interface PickupLocation {
  _id: string;
  name: Localized;
  address: Localized;
  coordinates?: { lat: number; lng: number };
  phone?: string;
  order: number;
}

export interface OperatingHours {
  weekly: Array<{ weekday: number; ranges: Array<{ open: string; close: string }> }>;
  exceptions: Array<{ date: string; closed: boolean; ranges: Array<{ open: string; close: string }> }>;
}

// ---------------------------------------------------------------- catalog
export interface Category {
  _id: string;
  name: Localized;
  description?: Localized;
  slug: string;
  parentId?: string | null;
  sortOrder: number;
  image?: ImageAsset;
  seoTitle?: Localized;
  seoDescription?: Localized;
}

export interface Collection {
  _id: string;
  name: Localized;
  description?: Localized;
  slug: string;
  image?: ImageAsset;
  seoTitle?: Localized;
  seoDescription?: Localized;
}

export interface Brand {
  _id: string;
  name: Localized;
  slug: string;
  description?: Localized;
}

export interface OptionAxis {
  key: string;
  name: Localized;
  /** Localized value labels and colour swatches, where the merchant set them; otherwise the value key is shown. */
  values?: Array<{ key: string; label: Localized; swatch?: string }>;
}

export interface Product {
  _id: string;
  name: Localized;
  description?: Localized;
  slug: string;
  categoryId?: string;
  collectionIds: string[];
  brandId?: string;
  sizeGuide?: string;
  images: ImageAsset[];
  optionAxes: OptionAxis[];
  attributes: Array<{ key: string; name: Localized; values: Array<{ key: string; value: Localized }> }>;
  seoTitle?: Localized;
  seoDescription?: Localized;
  listing: { minActivePrice?: Money; maxActivePrice?: Money; compareAtPrice?: Money; purchasableVariantCount: number; primaryImage?: ImageAsset; /** Listing responses only: at or below the store's low-stock threshold — a boolean, never the quantity. */ lowStock?: boolean };
  ratingsSummary: { average: number; count: number };
  createdAt: string;
}

/** The compact purchasable matrix (MDS §10) — a UI accelerator, never an authority. */
export interface MatrixVariant {
  variantId: string;
  optionValues: Array<{ key: string; value: string }>;
  price: Money;
  compareAtPrice?: Money;
  purchasable: boolean;
  lowStock?: boolean;
  sku: string;
  backorderPolicy: "DENY" | "CONTINUE_SELLING";
  /** Purchasable only because the merchant sells past zero — said as "available to order", never "in stock". The quantity itself never leaves the backend. */
  onBackorder: boolean;
  /** `EACH` | `PACK` | `BOX`; `unitsPerSale` is how many units one purchase carries. */
  unitOfMeasure: string;
  unitsPerSale: number;
  /** Colour-specific imagery; empty means the product's own gallery applies. */
  galleryOverride: ImageAsset[];
}

export interface ProductDetail {
  product: Product;
  variants: MatrixVariant[];
}

export interface CatalogFacets {
  categories: Array<{ key: string; count: number }>;
  brands: Array<{ key: string; count: number }>;
  priceRange: { min?: Money; max?: Money };
  /** `name` and each `label` are the merchant's own words; the `key`s are what a filter sends back. */
  attributes: Array<{ key: string; name: Localized; values: Array<{ key: string; label: Localized; count: number }> }>;
  /** Variant option axes (size, colour), counted over PURCHASABLE variants — a value only a sold-out variant carries is absent. Values are in the merchant's own order. */
  options: Array<{ key: string; name: Localized; values: Array<{ key: string; label: Localized; count: number }> }>;
  /** Products in scope with a purchasable variant — the count behind the in-stock toggle. */
  inStockCount: number;
}

/**
 * An automatic promotion, display fields only (the backend's `PublicPromotionView`).
 * Nothing here is arithmetic input: the storefront shows the name and the
 * condition, and the quote alone says what a cart is worth.
 */
export interface ActivePromotion {
  _id: string;
  name: Localized;
  description: Localized;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  minSubtotal?: Money;
  scope: { all: boolean; categoryIds: string[]; collectionIds: string[]; productIds: string[]; variantRestricted: boolean };
}

export interface SizeGuide {
  _id: string;
  name: Localized;
  description?: Localized;
  chartData: unknown;
}

export interface PublicReview {
  _id: string;
  rating: number;
  title: Localized;
  body: Localized;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface ContentPage {
  slug: string;
  title: Localized;
  content: Localized;
  version: number;
  seo?: { title?: Localized; description?: Localized };
}

// ---------------------------------------------------------------- shop (transactional)
export interface CartLine {
  lineId: string;
  variantId: string;
  quantity: number;
  note?: string;
}

export interface DeliveryAddress {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  governorate: string;
  postalCode?: string;
}

export interface CartView {
  lines: CartLine[];
  fulfilmentDraft?: { mode: "DELIVERY" | "PICKUP"; address?: DeliveryAddress; pickupLocationId?: string };
  appliedPromotionCode?: string;
  /** Guest carts only. Kept by the BFF in an httpOnly cookie — never reaches the browser. */
  cartToken?: string;
}

export interface QuoteLine {
  /** The cart line this prices — server-issued, opaque. */
  lineId: string;
  variantId: string;
  productId: string;
  productSlug: string;
  image: ImageAsset | null;
  /** The chosen options, localized — "Colour: Olive · Size: M" (MDS §6.5). */
  optionLabels: Array<{ axis: Localized; value: Localized }>;
  /** A line whose variant can no longer be bought is surfaced, not dropped (MDS §11); totals exclude it. */
  available: boolean;
  unavailableReason?: "INSUFFICIENT_STOCK" | "DISCONTINUED" | "NOT_PUBLISHED";
  sku: string;
  productName: string;
  variantDescription: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
}

/** The authoritative price of the cart — the only numbers this app shows for it (MDS §12). */
export interface Quote {
  lines: QuoteLine[];
  subtotal: Money;
  discount: Money;
  /** null until a fulfilment option is chosen (`shippingPending`). */
  shippingFee: Money | null;
  tax: Money;
  total: Money;
  /** The ONE promotion applied (the backend picks the best of the entered code and the automatic ones). `code` is "" for an automatic one. */
  promotion?: { code?: string; automatic?: boolean; name?: LocalizedString; subtotalDiscount: Money; waivesShippingFee: boolean };
  fulfilment: { mode: "DELIVERY" | "PICKUP"; fee: Money; zone?: string; dispatchBy: string; promisedWindow: { from: string; to: string } } | null;
  shippingPending: boolean;
  hasUnavailableLines: boolean;
}

/** `SHIPPED` is "dispatched"; `IN_TRANSIT` is an optional step after it; `COLLECTED` ends a pickup (an older pickup may still end as `DELIVERED`). */
export type OrderStatus = "PLACED" | "CONFIRMED" | "PROCESSING" | "READY_FOR_PICKUP" | "SHIPPED" | "IN_TRANSIT" | "DELIVERED" | "COLLECTED" | "CANCELLED";
export type PaymentStatus = "NOT_REQUIRED" | "AWAITING_PAYMENT" | "SUBMITTED" | "VERIFIED" | "REJECTED" | "REFUNDED";

export interface PlacedOrder {
  orderId: string;
  orderNumber: string;
  subtotal: Money;
  discount: Money;
  tax: Money;
  total: Money;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  promisedWindow?: { from: string; to: string };
  /** Guest orders only: the tracking credential, shown once (as a link). */
  accessToken?: string;
}

export interface OrderListItem {
  orderId: string;
  orderNumber: string;
  placedAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: Money;
  itemCount: number;
}

export interface OrderDetail {
  orderId: string;
  orderNumber: string;
  placedAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  /** `orderLineId` names a line in a return; `productId` names the product in a review (B-14). */
  lines: Array<{ lineNumber: number; orderLineId: string; productId: string | null; variantId: string; sku: string; productName: string; variantDescription: string; quantity: number; unitPrice: Money; lineTotal: Money }>;
  subtotal: Money;
  discount: Money;
  tax: Money;
  total: Money;
  fulfilment: {
    mode: "DELIVERY" | "PICKUP";
    fee: Money;
    zone?: string;
    dispatchBy?: string;
    promisedWindow?: { from: string; to: string };
    addressSnapshot?: DeliveryAddress;
    pickupLocationSnapshot?: { name: string; address: string; phone?: string };
  };
  /** The destination and instructions are the order's SNAPSHOT — what the customer agreed to pay, not today's settings. */
  payment: { method: string; status: PaymentStatus; rejectionReason?: string; destination?: { accountName?: string; number?: string; handle?: string }; instructions?: Localized };
  canCancel: boolean;
  /** The customer's own note from checkout, echoed back. Absent when none was given. */
  notes?: string;
  /** Carrier and tracking number staff entered. `url` was frozen when they did; render it only as an https link. */
  tracking?: { carrierName: string; trackingNumber: string; url: string };
  /** Present when the order has an invoice. Orders placed before invoices existed have none. */
  invoiceNumber?: string;
  /** Customer-safe events only (B-13): a type and a time — never an actor or an internal note. */
  timeline?: Array<{ type: string; at: string }>;
}

/** `GET /api/shop/orders/:orderNumber/invoice` — built by the backend from the order's own snapshots; money as decimal strings. */
export interface Invoice {
  invoiceNumber: string;
  orderNumber: string;
  issuedAt: string;
  placedAt: string;
  /** `VOID` once the order is cancelled: the invoice keeps its number and still prints. */
  status: "ISSUED" | "VOID";
  voidedAt?: string;
  seller?: { name: Localized; phone?: string; email?: string };
  billTo: { name?: string; phone?: string; email?: string };
  fulfilment: {
    mode: "DELIVERY" | "PICKUP";
    zone?: string;
    address?: DeliveryAddress;
    pickupLocation?: { name: string; address: string; phone?: string };
  };
  lines: Array<{ lineNumber: number; sku: string; productName: string; variantDescription: string; quantity: number; unitPrice: Money; discount: Money; lineTotal: Money }>;
  subtotal: Money;
  discount: Money;
  promotionCode?: string;
  shipping: Money;
  /** `ADDED`: `amount` sits on top of the subtotal. `INCLUDED`: `amount` is already inside the total. The mode in force at placement. */
  tax: { mode: "INCLUDED" | "ADDED"; rate: number; amount: Money };
  total: Money;
  payment: { method: string; status: PaymentStatus };
  refunds: { total: Money; entries: Array<{ kind: "PAYMENT" | "RETURN"; amount: Money; at?: string; reference?: string; returnNumber?: string }> };
}

export interface CustomerProfile {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  /** Marketing consent: `{ granted: false }` until the customer opts in (never pre-ticked). */
  marketingConsent?: { granted: boolean; at?: string; source?: "signup" | "account" | "checkout" | "newsletter" };
}

export interface Address extends DeliveryAddress {
  _id: string;
  label: string;
  isDefault: boolean;
}

export interface WishlistItem {
  _id: string;
  productId: string;
  productSlug: string;
  productName: Localized;
  addedAt: string;
}

export interface ReturnListItem {
  returnId: string;
  returnNumber: string;
  orderNumber: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "REFUNDED";
  reason: string;
  requestedAt: string;
  lineCount: number;
}
