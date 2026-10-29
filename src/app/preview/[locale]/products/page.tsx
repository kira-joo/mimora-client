import { ListingView } from "../../../../preview/listing/listing-view";
import type { CatalogQuery, SortKey } from "../../../../preview/mock-api/catalog-query";
import type { Locale } from "../../../../preview/types";

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const many = (value: string | string[] | undefined) => (value === undefined ? undefined : Array.isArray(value) ? value : [value]);

/** Product listing (MDS §6.2). Filters arrive in the URL, so a filtered view is shareable. */
export default async function PreviewListing({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Params> }) {
  const { locale } = await params;
  const search = await searchParams;
  const initial: CatalogQuery = {
    q: one(search.q),
    category: one(search.category),
    collection: one(search.collection),
    size: many(search.size),
    colour: many(search.colour),
    price: one(search.price),
    sort: (one(search.sort) as SortKey | undefined) ?? "relevance",
  };
  return <ListingView key={JSON.stringify(initial)} locale={locale} initial={initial} />;
}
