/** The backend's page ceiling (`maxLimit`) — also the biggest page worth asking for. */
export const MAX_PAGE_SIZE = 100;

/** A hard ceiling on how many pages one walk will take: 500 × 100 = 50,000 products. Reaching it is logged, never silent. */
const MAX_PAGES = 500;
const CONCURRENCY = 4;

interface Page<T> {
  data: T[];
  totalPages: number;
}

/**
 * Every item of a paginated read — the sitemap and the product pages'
 * `generateStaticParams` must cover the whole catalogue, not its first page.
 *
 * The first page says how many there are; the rest are fetched a few at a time.
 * A failed page REJECTS the whole walk: a silently partial list is worse than
 * none (a sitemap missing a tenth of the catalogue looks complete), so the
 * caller decides what "no list" means (D-15: no prebuilt pages, never a failed build).
 */
export async function fetchAllPages<T>(fetchPage: (page: number) => Promise<Page<T>>, options: { maxPages?: number; onTruncated?: (totalPages: number, maxPages: number) => void } = {}): Promise<T[]> {
  const maxPages = options.maxPages ?? MAX_PAGES;
  const first = await fetchPage(1);
  const items = [...first.data];
  const last = Math.min(first.totalPages, maxPages);
  if (first.totalPages > maxPages) options.onTruncated?.(first.totalPages, maxPages);

  const rest = Array.from({ length: Math.max(0, last - 1) }, (_, index) => index + 2);
  for (let start = 0; start < rest.length; start += CONCURRENCY) {
    const pages = await Promise.all(rest.slice(start, start + CONCURRENCY).map((page) => fetchPage(page)));
    for (const page of pages) items.push(...page.data);
  }
  return items;
}
