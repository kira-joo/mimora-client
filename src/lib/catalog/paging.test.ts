import { describe, expect, it, vi } from "vitest";
import { fetchAllPages } from "./paging";

const source = (total: number, size: number) => {
  const all = Array.from({ length: total }, (_, index) => `p${index}`);
  const totalPages = Math.max(1, Math.ceil(total / size));
  return vi.fn(async (page: number) => ({ data: all.slice((page - 1) * size, page * size), totalPages }));
};

describe("fetchAllPages", () => {
  it("returns every item across pages, in order — not just the first hundred", async () => {
    const fetchPage = source(250, 100);
    const items = await fetchAllPages(fetchPage);
    expect(items).toHaveLength(250);
    expect(items[0]).toBe("p0");
    expect(items[249]).toBe("p249");
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("makes one request for a catalogue that fits one page, and none extra for an empty one", async () => {
    const one = source(40, 100);
    expect(await fetchAllPages(one)).toHaveLength(40);
    expect(one).toHaveBeenCalledTimes(1);
    expect(await fetchAllPages(source(0, 100))).toEqual([]);
  });

  it("fetches more pages than the concurrency window without skipping or duplicating any", async () => {
    const items = await fetchAllPages(source(1050, 100));
    expect(items).toHaveLength(1050);
    expect(new Set(items).size).toBe(1050);
  });

  it("rejects when any page fails instead of returning a silently partial list", async () => {
    const fetchPage = vi.fn(async (page: number) => {
      if (page === 3) throw new Error("boom");
      return { data: [`p${page}`], totalPages: 5 };
    });
    await expect(fetchAllPages(fetchPage)).rejects.toThrow("boom");
  });

  it("stops at the ceiling and says so", async () => {
    const onTruncated = vi.fn();
    const items = await fetchAllPages(source(500, 10), { maxPages: 3, onTruncated });
    expect(items).toHaveLength(30);
    expect(onTruncated).toHaveBeenCalledWith(50, 3);
  });
});
