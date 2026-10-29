import { MethodType, type Endpoint } from "@kira-joo/frontend-toolkit-core/server";

/*
 * Newsletter capture and marketing consent (legal-and-consent.md §4). Kept in their
 * own file — the same two-sided shape as `shop.endpoints.ts` / `session.endpoints.ts`
 * — so the privacy surface is one place to read, not four edits into the big tables.
 */
const e = (url: string, methodType: MethodType) => ({ url, methodType }) as Endpoint<{ params?: Record<string, string> }>;

/** Backend side — called only by this app's own `/api/session/**` handlers. */
export const ShopPrivacyEndpoints = {
  newsletter: e("newsletter", MethodType.POST),
  /** Double opt-in: the emailed link's token. */
  confirmNewsletter: e("newsletter/confirm", MethodType.POST),
  marketingConsent: e("profile/marketing-consent", MethodType.PUT),
} as const;

export type MarketingConsent = { granted: boolean; at?: string; source?: "signup" | "account" | "checkout" | "newsletter" };

/** Browser side — base `/api/session` (session-client.ts). */
export const SessionPrivacyEndpoints = {
  /** The backend answers `202 { status: "accepted" }` however the address stood — new, repeated, or unsubscribed — and so does this layer. */
  newsletter: { url: "newsletter", methodType: MethodType.POST } as Endpoint<{ body: { email: string; locale?: "ar" | "en"; source?: "footer" | "checkout" }; returnType: { status: "accepted" } }>,
  confirmNewsletter: { url: "newsletter/confirm", methodType: MethodType.POST } as Endpoint<{ body: { token: string }; returnType: void }>,
  marketingConsent: { url: "profile/marketing-consent", methodType: MethodType.PUT } as Endpoint<{ body: { granted: boolean; source?: "account" | "checkout"; locale?: "ar" | "en" }; returnType: MarketingConsent }>,
} as const;
