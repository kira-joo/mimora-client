import { MethodType, type Endpoint } from "@kira-joo/frontend-toolkit-core/server";

/*
 * `/api/shop/**` on the backend — called ONLY server-to-server by this app's
 * own `/api/session/**` handlers (MDS §8). The base URL owns `api/shop`;
 * these own only the resource path. Request/response bodies are passed through
 * the BFF, so the shapes live in ./types and the session endpoints.
 */
const e = (url: string, methodType: MethodType) => ({ url, methodType }) as Endpoint<{ params?: Record<string, string> }>;

export const ShopEndpoints = {
  login: e("auth/login", MethodType.POST),
  signup: e("auth/signup", MethodType.POST),
  refresh: e("auth/refresh", MethodType.POST),
  logout: e("auth/logout", MethodType.POST),
  forgotPassword: e("auth/forgot-password", MethodType.POST),
  resetPassword: e("auth/reset-password", MethodType.POST),
  verifyEmail: e("auth/verify-email", MethodType.POST),
  resendVerification: e("auth/resend-verification", MethodType.POST),

  cart: e("cart", MethodType.GET),
  cartLines: e("cart/lines", MethodType.POST),
  cartLineUpdate: e("cart/lines/:lineId", MethodType.PUT),
  cartLineRemove: e("cart/lines/:lineId", MethodType.DELETE),
  cartFulfilment: e("cart/fulfilment", MethodType.PUT),
  cartPromotionApply: e("cart/promotion", MethodType.POST),
  cartPromotionRemove: e("cart/promotion", MethodType.DELETE),
  quote: e("quote", MethodType.POST),

  orderPlace: e("orders", MethodType.POST),
  orderList: e("orders", MethodType.GET),
  orderDetail: e("orders/:orderNumber", MethodType.GET),
  orderCancel: e("orders/:orderNumber/cancel", MethodType.POST),
  orderPaymentProof: e("orders/:orderNumber/payment-proof", MethodType.POST),
  orderInvoice: e("orders/:orderNumber/invoice", MethodType.GET),

  profile: e("profile", MethodType.GET),
  profileUpdate: e("profile", MethodType.PUT),
  passwordChange: e("profile/password", MethodType.PUT),

  addressList: e("addresses", MethodType.GET),
  addressCreate: e("addresses", MethodType.POST),
  addressUpdate: e("addresses/:id", MethodType.PUT),
  addressDelete: e("addresses/:id", MethodType.DELETE),

  wishlist: e("wishlist", MethodType.GET),
  wishlistAdd: e("wishlist", MethodType.POST),
  wishlistRemove: e("wishlist/:productId", MethodType.DELETE),

  returnList: e("returns", MethodType.GET),
  returnCreate: e("returns", MethodType.POST),
  returnDetail: e("returns/:id", MethodType.GET),

  reviewCreate: e("reviews", MethodType.POST),
  reviewsMine: e("reviews/mine", MethodType.GET),
} as const;

export type ShopEndpoint = (typeof ShopEndpoints)[keyof typeof ShopEndpoints];
