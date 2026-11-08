import { MethodType, type Endpoint } from "@kira-joo/frontend-toolkit-core/server";
import type {
  ActivePromotion,
  Brand,
  CatalogFacets,
  Category,
  Collection,
  ContentPage,
  DeliveryZone,
  FulfilmentSettings,
  OperatingHours,
  Paginated,
  PaymentMethodView,
  PickupLocation,
  Product,
  ProductDetail,
  PublicReview,
  SizeGuide,
  StoreProfile,
  StorefrontContent,
  ThemeView,
} from "./types";

/*
 * `/api/storefront/**` — public catalog and configuration. The base URL owns
 * the `api/storefront` prefix (clients.ts); each constant owns only the
 * resource path. Never hardcode a path at a call site.
 */
export type ProductListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  collectionId?: string;
  brandId?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: ProductSort;
  ids?: string;
  /** `key:value` pairs joined by `|` (the backend's `attr` separator): values of one key are alternatives, different keys all must match. */
  attr?: string;
  /** `axis:value` pairs over the variant option axes (size, colour), joined by `|`: values of one axis are alternatives, different axes all must match. Matched against purchasable variants only. */
  opt?: string;
  /** Only products with a purchasable variant. */
  inStock?: boolean;
};

export type ProductSort = "newest" | "price_asc" | "price_desc";

export const StorefrontEndpoints = {
  storeProfile: { url: "store-profile", methodType: MethodType.GET } as Endpoint<{ returnType: StoreProfile }>,
  theme: { url: "theme", methodType: MethodType.GET } as Endpoint<{ returnType: ThemeView }>,
  content: { url: "content", methodType: MethodType.GET } as Endpoint<{ returnType: StorefrontContent }>,
  fulfilmentSettings: { url: "fulfilment-settings", methodType: MethodType.GET } as Endpoint<{ returnType: FulfilmentSettings }>,
  paymentMethods: { url: "payment-methods", methodType: MethodType.GET } as Endpoint<{ returnType: PaymentMethodView[] }>,
  operatingHours: { url: "operating-hours", methodType: MethodType.GET } as Endpoint<{ returnType: OperatingHours }>,
  deliveryZones: { url: "delivery-zones", methodType: MethodType.GET } as Endpoint<{ returnType: DeliveryZone[] }>,
  pickupLocations: { url: "pickup-locations", methodType: MethodType.GET } as Endpoint<{ returnType: PickupLocation[] }>,
  categories: { url: "categories", methodType: MethodType.GET } as Endpoint<{ returnType: Category[] }>,
  collections: { url: "collections", methodType: MethodType.GET } as Endpoint<{ returnType: Collection[] }>,
  brands: { url: "brands", methodType: MethodType.GET } as Endpoint<{ returnType: Brand[] }>,
  products: { url: "products", methodType: MethodType.GET } as Endpoint<{ query: ProductListQuery; returnType: Paginated<Product> }>,
  productDetail: { url: "products/:slug", methodType: MethodType.GET } as Endpoint<{ params: { slug: string }; returnType: ProductDetail }>,
  facets: { url: "facets", methodType: MethodType.GET } as Endpoint<{ query: { categoryId?: string; collectionId?: string; search?: string }; returnType: CatalogFacets }>,
  sizeGuide: { url: "size-guides/:id", methodType: MethodType.GET } as Endpoint<{ params: { id: string }; returnType: SizeGuide }>,
  reviews: { url: "reviews/:productId", methodType: MethodType.GET } as Endpoint<{ params: { productId: string }; query: { page?: number; limit?: number }; returnType: Paginated<PublicReview> }>,
  page: { url: "pages/:slug", methodType: MethodType.GET } as Endpoint<{ params: { slug: string }; returnType: ContentPage }>,
  activePromotions: { url: "promotions/active", methodType: MethodType.GET } as Endpoint<{ returnType: ActivePromotion[] }>,
} as const;
