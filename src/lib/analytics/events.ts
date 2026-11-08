/*
 * The analytics event contract: provider-agnostic, first-party, and PII-free BY
 * CONSTRUCTION. Every payload is built here from an allow-list of fields, so a
 * component cannot hand over a whole cart, order or customer by accident — and it
 * can never hand over an email, a phone number, a name or an address, because no
 * builder has a field for one.
 *
 * Names follow the de-facto ecommerce vocabulary (view_item_list … purchase) so any
 * tag manager maps them without translation. Prices are NOT sent as the client's
 * own arithmetic (this app never computes one — CLAUDE.md non-negotiable 3): the one
 * amount in the whole contract is the `purchase` value, copied verbatim from the
 * server's confirmed order.
 */

export interface AnalyticsItem {
  /** The product's id — an opaque identifier, not its name. */
  item_id: string;
  /** The chosen variant's id, where a variant is meant. */
  item_variant?: string;
  quantity?: number;
  /** Position in a list, 1-based. */
  index?: number;
}

export type AnalyticsEvent =
  | { name: "view_item_list"; params: { list_id: string; items: AnalyticsItem[] } }
  | { name: "view_item"; params: { items: AnalyticsItem[] } }
  | { name: "add_to_cart"; params: { items: AnalyticsItem[] } }
  | { name: "remove_from_cart"; params: { items: AnalyticsItem[] } }
  | { name: "begin_checkout"; params: { item_count: number } }
  | { name: "add_payment_info"; params: { payment_type: string } }
  | { name: "purchase"; params: { transaction_id: string; value: string; currency: string; item_count: number } }
  | { name: "sign_up"; params: { method: "phone" } }
  | { name: "login"; params: { method: "phone" } }
  | { name: "search"; params: { search_term?: string; result_count?: number } };

/** A list event reports at most this many items: enough to learn what was shown, never a page of the whole catalog. */
export const MAX_LIST_ITEMS = 20;
export const MAX_SEARCH_TERM_LENGTH = 80;

const item = (value: { productId: string; variantId?: string; quantity?: number; index?: number }): AnalyticsItem => ({
  item_id: value.productId,
  ...(value.variantId ? { item_variant: value.variantId } : {}),
  ...(value.quantity !== undefined ? { quantity: value.quantity } : {}),
  ...(value.index !== undefined ? { index: value.index } : {}),
});

export const viewItemList = (listId: string, products: Array<{ productId: string }>): AnalyticsEvent => ({
  name: "view_item_list",
  params: { list_id: listId, items: products.slice(0, MAX_LIST_ITEMS).map((product, position) => item({ productId: product.productId, index: position + 1 })) },
});

export const viewItem = (productId: string): AnalyticsEvent => ({ name: "view_item", params: { items: [item({ productId })] } });

export const addToCart = (line: { productId: string; variantId: string; quantity: number }): AnalyticsEvent => ({ name: "add_to_cart", params: { items: [item(line)] } });

export const removeFromCart = (line: { productId: string; variantId: string; quantity: number }): AnalyticsEvent => ({ name: "remove_from_cart", params: { items: [item(line)] } });

export const beginCheckout = (itemCount: number): AnalyticsEvent => ({ name: "begin_checkout", params: { item_count: itemCount } });

export const addPaymentInfo = (paymentMethod: string): AnalyticsEvent => ({ name: "add_payment_info", params: { payment_type: paymentMethod } });

/** `value` and `currency` are the server's confirmed total and the store's currency, verbatim. */
export const purchase = (order: { orderNumber: string; total: string; currency: string; itemCount: number }): AnalyticsEvent => ({
  name: "purchase",
  params: { transaction_id: order.orderNumber, value: order.total, currency: order.currency, item_count: order.itemCount },
});

export const signUp = (): AnalyticsEvent => ({ name: "sign_up", params: { method: "phone" } });
export const login = (): AnalyticsEvent => ({ name: "login", params: { method: "phone" } });

const EMAIL_LIKE = /\S+@\S+/;
const PHONE_LIKE = /(?:\d[\s\-.()]*){7,}/;

/**
 * A search term is typed by a person, and people type their own phone number or
 * email into search boxes. Anything that looks like either is dropped (the event
 * still records that a search happened and how many results it had); the rest is
 * trimmed, lower-cased and capped.
 */
export function searchTerm(raw: string): string | undefined {
  const cleaned = raw.trim().toLowerCase().slice(0, MAX_SEARCH_TERM_LENGTH);
  if (!cleaned || EMAIL_LIKE.test(cleaned) || PHONE_LIKE.test(cleaned)) return undefined;
  return cleaned;
}

export const search = (raw: string, resultCount?: number): AnalyticsEvent => {
  const term = searchTerm(raw);
  return { name: "search", params: { ...(term ? { search_term: term } : {}), ...(resultCount !== undefined ? { result_count: resultCount } : {}) } };
};

const PII_KEYS = /^(e?-?mail|phone|tel|mobile|name|first_?name|last_?name|full_?name|address|street|city|token|password|customer_?id|user_?id|ip)$/i;

/**
 * Belt and braces behind the typed builders: the paths (`items.0.email`) of anything in
 * a payload that is named like personal data or looks like an email address. The emitter
 * refuses to send an event with a finding; the tests assert every builder yields none.
 */
export function findPii(value: unknown, path = ""): string[] {
  if (typeof value === "string") return EMAIL_LIKE.test(value) ? [path || "(value)"] : [];
  if (Array.isArray(value)) return value.flatMap((entry, index) => findPii(entry, `${path}.${index}`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entry]) => (PII_KEYS.test(key) ? [`${path}.${key}`] : findPii(entry, `${path}.${key}`)));
  }
  return [];
}
