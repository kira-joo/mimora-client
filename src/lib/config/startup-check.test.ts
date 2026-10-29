import { describe, expect, it } from "vitest";
import { configurationGaps } from "./startup-check";

const complete = { STAFF_API_URL: "http://backend", STORE_ID: "store-a", REVALIDATE_SECRET: "s", SITE_URL: "https://shop", STORE_TIMEZONE: "Africa/Cairo" };

describe("configurationGaps", () => {
  it("is silent for a complete configuration", () => {
    expect(configurationGaps(complete)).toEqual([]);
  });

  it.each(Object.keys(complete))("names %s when it is missing or empty", (name) => {
    for (const value of [undefined, ""]) {
      const gaps = configurationGaps({ ...complete, [name]: value });
      expect(gaps).toHaveLength(1);
      expect(gaps[0]).toContain(name);
    }
  });

  it("says that cache invalidation is OFF without the secret", () => {
    expect(configurationGaps({ ...complete, REVALIDATE_SECRET: undefined })[0]).toMatch(/invalidation is OFF/);
  });
});
