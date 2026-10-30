import { describe, expect, it } from "vitest";
import type { DeliveryZone, FulfilmentSettings } from "@/lib/api/types";
import en from "@/i18n/locales/en/common.json";
import { storeAssurances } from "./assurances";

/** A tiny ICU stand-in is not worth it: the test checks WHICH message the helper selects and with what values. */
const t = (key: string, values?: Record<string, string | number>) => `${key}:${JSON.stringify(values ?? {})}`;
const zone = (leadDays: number) => ({ leadDays }) as DeliveryZone;
const fulfilment = { deliveryEnabled: true, returnWindowDays: 14 } as FulfilmentSettings;

describe("storeAssurances — delivery window", () => {
  it("names a range when zones differ", () => {
    expect(storeAssurances("en", t, fulfilment, [zone(1), zone(3)], []).delivery).toBe('deliveryLine:{"min":"1","max":"3"}');
  });
  it("names the single figure when every zone agrees — never '2–2 days'", () => {
    expect(storeAssurances("en", t, fulfilment, [zone(2), zone(2)], []).delivery).toBe('deliveryLineExact:{"n":2,"days":"2"}');
  });
  it("says nothing without zones or with delivery off", () => {
    expect(storeAssurances("en", t, fulfilment, [], []).delivery).toBeUndefined();
    expect(storeAssurances("en", t, { ...fulfilment, deliveryEnabled: false }, [zone(2)], []).delivery).toBeUndefined();
  });
  it("ships the exact-window message in the catalogue, with a plural selector", () => {
    expect(en.deliveryLineExact).toContain("plural");
  });
});
