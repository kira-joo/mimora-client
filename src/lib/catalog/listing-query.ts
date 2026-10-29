import type { ProductListQuery, ProductSort } from "@/lib/api/storefront.endpoints";
import type { Brand, Category, Collection } from "@/lib/api/types";

/*
 * Listing state lives in the URL (MDS §9) — shareable, back-navigable — in
 * customer terms (slugs, not database ids). This module is the one place that
 * reads it, writes it, and maps it to the backend's query.
 */
export const SORTS: ProductSort[] = ["newest", "price_asc", "price_desc"];
export const PAGE_SIZE = 24;

export interface ListingState {
  q?: string;
  category?: string;
  collection?: string;
  brand?: string;
  /** Typed by the customer, sent as entered — never computed (MDS §24). */
  minPrice?: string;
  maxPrice?: string;
  /** Attribute filters as `key:value`, sorted and unique. Values of one key are alternatives (OR); different keys all must match (AND). */
  attr: string[];
  /** Variant option filters (size, colour) as `axis:value`, sorted and unique. Same rule: OR within an axis, AND across axes. */
  opt: string[];
  /** Only products with a purchasable variant. */
  inStock: boolean;
  sort: ProductSort;
  page: number;
}

const MONEY = /^\d+(\.\d{1,2})?$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/;
/** `key:value` — neither half may contain a colon, whitespace or the backend's `|` list separator. */
const ATTRIBUTE = /^[^\s:|]{1,64}:[^\s:|]{1,64}$/;
/** `axis:value` — the axis has no colon, whitespace or `|`; the value may contain spaces ("extra large") but no colon or the backend's `|` separator. */
const OPTION = /^[^\s:|]{1,64}:[^:|]{1,64}$/;
const MAX_ATTRIBUTE_FILTERS = 20;

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() || undefined;

/** Pairs → `key:value`, malformed ones dropped, then unique and sorted so one filter set has exactly one URL. */
export function normalizeAttributes(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value) && ATTRIBUTE.test(value!)))].sort().slice(0, MAX_ATTRIBUTE_FILTERS);
}

/** Pairs → `axis:value`, trimmed, malformed ones dropped, then unique and sorted so one filter set has exactly one URL. */
export function normalizeOptions(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value) && OPTION.test(value!)))].sort().slice(0, MAX_ATTRIBUTE_FILTERS);
}

/** Adds or removes one value of one option axis — the URL change a checkbox makes. */
export function toggleOption(opt: string[], key: string, value: string): string[] {
  const pair = attributePair(key, value);
  return normalizeOptions(opt.includes(pair) ? opt.filter((candidate) => candidate !== pair) : [...opt, pair]);
}

export const attributePair = (key: string, value: string) => `${key}:${value}`;

/** The `valueKey`s currently chosen for one attribute key. */
export function selectedValues(attr: string[], key: string): string[] {
  const prefix = `${key}:`;
  return attr.filter((pair) => pair.startsWith(prefix)).map((pair) => pair.slice(prefix.length));
}

/** Adds or removes one value of one attribute key — the URL change a checkbox makes. */
export function toggleAttribute(attr: string[], key: string, value: string): string[] {
  const pair = attributePair(key, value);
  return normalizeAttributes(attr.includes(pair) ? attr.filter((candidate) => candidate !== pair) : [...attr, pair]);
}

export function parseListing(params: Params): ListingState {
  const sort = one(params.sort);
  const page = Number(one(params.page));
  const slug = (value: string | undefined) => (value && SLUG.test(value) ? value : undefined);
  const money = (value: string | undefined) => (value && MONEY.test(value) ? value : undefined);
  return {
    q: one(params.q)?.slice(0, 100),
    category: slug(one(params.category)),
    collection: slug(one(params.collection)),
    brand: slug(one(params.brand)),
    minPrice: money(one(params.minPrice)),
    maxPrice: money(one(params.maxPrice)),
    attr: normalizeAttributes(Array.isArray(params.attr) ? params.attr : [params.attr]),
    opt: normalizeOptions(Array.isArray(params.opt) ? params.opt : [params.opt]),
    inStock: one(params.inStock) === "1",
    sort: SORTS.includes(sort as ProductSort) ? (sort as ProductSort) : "newest",
    page: Number.isInteger(page) && page > 1 && page < 1000 ? page : 1,
  };
}

/** The canonical query string — defaults omitted so a plain listing has a plain URL. */
export function toSearch(state: Partial<ListingState>): string {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.category) params.set("category", state.category);
  if (state.collection) params.set("collection", state.collection);
  if (state.brand) params.set("brand", state.brand);
  if (state.minPrice) params.set("minPrice", state.minPrice);
  if (state.maxPrice) params.set("maxPrice", state.maxPrice);
  for (const pair of normalizeAttributes(state.attr ?? [])) params.append("attr", pair);
  for (const pair of normalizeOptions(state.opt ?? [])) params.append("opt", pair);
  if (state.inStock) params.set("inStock", "1");
  if (state.sort && state.sort !== "newest") params.set("sort", state.sort);
  if (state.page && state.page > 1) params.set("page", String(state.page));
  const value = params.toString();
  return value ? `?${value}` : "";
}

export interface Lookups {
  categories: Category[];
  collections: Collection[];
  brands: Brand[];
}

/** Slugs → backend ids. An unknown slug yields `null` (the scope does not exist — a 404, not "everything"). */
export function toApiQuery(state: ListingState, lookups: Lookups, limit = PAGE_SIZE): ProductListQuery | null {
  const categoryId = state.category ? lookups.categories.find((category) => category.slug === state.category)?._id : undefined;
  const collectionId = state.collection ? lookups.collections.find((collection) => collection.slug === state.collection)?._id : undefined;
  const brandId = state.brand ? lookups.brands.find((brand) => brand.slug === state.brand)?._id : undefined;
  if ((state.category && !categoryId) || (state.collection && !collectionId) || (state.brand && !brandId)) return null;
  return {
    page: state.page,
    limit,
    ...(state.q ? { search: state.q } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(collectionId ? { collectionId } : {}),
    ...(brandId ? { brandId } : {}),
    ...(state.minPrice ? { minPrice: state.minPrice } : {}),
    ...(state.maxPrice ? { maxPrice: state.maxPrice } : {}),
    ...(state.attr.length ? { attr: state.attr.join("|") } : {}),
    ...(state.opt.length ? { opt: state.opt.join("|") } : {}),
    ...(state.inStock ? { inStock: true } : {}),
    ...(state.sort !== "newest" ? { sort: state.sort } : {}),
  };
}

/** Whether anything narrows the listing — filtered views are dynamic and `noindex` (MDS §5, §21). */
export function isFiltered(state: ListingState): boolean {
  return Boolean(state.q || state.minPrice || state.maxPrice || state.brand || state.attr.length > 0 || state.opt.length > 0 || state.inStock || state.sort !== "newest" || state.page > 1);
}
