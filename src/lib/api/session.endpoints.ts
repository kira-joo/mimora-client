import { MethodType, type Endpoint } from "@kira-joo/frontend-toolkit-core/server";
import type { Address, CartView, CustomerProfile, DeliveryAddress, Invoice, MatrixVariant, OrderDetail, OrderListItem, PlacedOrder, Quote, ReturnListItem, WishlistItem } from "./types";

/*
 * Browser → this app's own BFF (`/api/session/**`, base in session-client.ts).
 * The only endpoints browser code may call — there is no browser-to-backend
 * client (MDS §8).
 */
export type FulfilmentDraft = { mode: "DELIVERY"; address: DeliveryAddress } | { mode: "PICKUP"; pickupLocationId: string };

export const SessionEndpoints = {
  me: { url: "me", methodType: MethodType.GET } as Endpoint<{ returnType: { customer: CustomerProfile | null } }>,
  login: { url: "auth/login", methodType: MethodType.POST } as Endpoint<{ body: { phone: string; password: string }; returnType: CustomerProfile }>,
  signup: { url: "auth/signup", methodType: MethodType.POST } as Endpoint<{ body: { phone: string; password: string; name: string; email?: string; marketingConsent?: boolean; locale?: "ar" | "en" }; returnType: { status: "accepted" } }>,
  refresh: { url: "auth/refresh", methodType: MethodType.POST } as Endpoint<{ returnType: void }>,
  logout: { url: "auth/logout", methodType: MethodType.POST } as Endpoint<{ returnType: void }>,
  forgotPassword: { url: "auth/forgot-password", methodType: MethodType.POST } as Endpoint<{ body: { identifier: string }; returnType: void }>,
  resetPassword: { url: "auth/reset-password", methodType: MethodType.POST } as Endpoint<{ body: { token: string; newPassword: string }; returnType: void }>,
  verifyEmail: { url: "auth/verify-email", methodType: MethodType.POST } as Endpoint<{ body: { token: string }; returnType: void }>,

  cart: { url: "cart", methodType: MethodType.GET } as Endpoint<{ returnType: CartView }>,
  addLine: { url: "cart/lines", methodType: MethodType.POST } as Endpoint<{ body: { variantId: string; quantity: number }; returnType: CartView }>,
  updateLine: { url: "cart/lines/:lineId", methodType: MethodType.PUT } as Endpoint<{ params: { lineId: string }; body: { quantity: number }; returnType: CartView }>,
  removeLine: { url: "cart/lines/:lineId", methodType: MethodType.DELETE } as Endpoint<{ params: { lineId: string }; returnType: CartView }>,
  setFulfilment: { url: "cart/fulfilment", methodType: MethodType.PUT } as Endpoint<{ body: FulfilmentDraft; returnType: CartView }>,
  applyPromotion: { url: "cart/promotion", methodType: MethodType.POST } as Endpoint<{ body: { code: string }; returnType: CartView }>,
  removePromotion: { url: "cart/promotion", methodType: MethodType.DELETE } as Endpoint<{ returnType: CartView }>,
  quote: { url: "quote", methodType: MethodType.POST } as Endpoint<{ returnType: Quote }>,

  placeOrder: { url: "orders", methodType: MethodType.POST } as Endpoint<{ body: { paymentMethod: string; termsVersionAccepted: number; guestContact?: { name: string; phone: string; email?: string }; notes?: string }; returnType: PlacedOrder }>,
  orders: { url: "orders", methodType: MethodType.GET } as Endpoint<{ query: { limit?: number; offset?: number }; returnType: OrderListItem[] }>,
  order: { url: "orders/:orderNumber", methodType: MethodType.GET } as Endpoint<{ params: { orderNumber: string }; returnType: OrderDetail }>,
  cancelOrder: { url: "orders/:orderNumber/cancel", methodType: MethodType.POST } as Endpoint<{ params: { orderNumber: string }; body: { reason?: string }; returnType: { success: boolean } }>,
  orderInvoice: { url: "orders/:orderNumber/invoice", methodType: MethodType.GET } as Endpoint<{ params: { orderNumber: string }; returnType: Invoice }>,
  paymentProof: { url: "orders/:orderNumber/payment-proof", methodType: MethodType.POST } as Endpoint<{ params: { orderNumber: string }; body: FormData; returnType: { proofId: string; submittedAt: string; paymentStatus: string } }>,

  updateProfile: { url: "profile", methodType: MethodType.PUT } as Endpoint<{ body: { name: string; email?: string }; returnType: CustomerProfile }>,
  changePassword: { url: "profile/password", methodType: MethodType.PUT } as Endpoint<{ body: { oldPassword: string; newPassword: string }; returnType: { message: string } }>,
  addresses: { url: "addresses", methodType: MethodType.GET } as Endpoint<{ returnType: { addresses: Address[]; total: number } }>,
  createAddress: { url: "addresses", methodType: MethodType.POST } as Endpoint<{ body: Omit<Address, "_id" | "isDefault"> & { isDefault?: boolean }; returnType: Address }>,
  updateAddress: { url: "addresses/:id", methodType: MethodType.PUT } as Endpoint<{ params: { id: string }; body: Partial<Omit<Address, "_id">>; returnType: Address }>,
  deleteAddress: { url: "addresses/:id", methodType: MethodType.DELETE } as Endpoint<{ params: { id: string }; returnType: { message: string } }>,
  wishlist: { url: "wishlist", methodType: MethodType.GET } as Endpoint<{ query: { limit?: number }; returnType: { items: WishlistItem[]; total: number } }>,
  addToWishlist: { url: "wishlist", methodType: MethodType.POST } as Endpoint<{ body: { productId: string }; returnType: { _id: string; productId: string } }>,
  removeFromWishlist: { url: "wishlist/:productId", methodType: MethodType.DELETE } as Endpoint<{ params: { productId: string }; returnType: { message: string } }>,
  returns: { url: "returns", methodType: MethodType.GET } as Endpoint<{ returnType: ReturnListItem[] }>,
  requestReturn: { url: "returns", methodType: MethodType.POST } as Endpoint<{ body: { orderNumber: string; reason: string; lines: Array<{ orderLineId: string; quantity: number; reason: string; condition: string }> }; returnType: ReturnListItem }>,
  createReview: { url: "reviews", methodType: MethodType.POST } as Endpoint<{ body: { productId: string; rating: number; title: string; body: string }; returnType: unknown }>,
} as const;

/** Not a session call: live availability from this app's `/api/catalog` (no-store). Base in session-client.ts. */
export const CatalogEndpoints = {
  availability: { url: "availability/:slug", methodType: MethodType.GET } as Endpoint<{ params: { slug: string }; returnType: { variants: MatrixVariant[] } }>,
} as const;
