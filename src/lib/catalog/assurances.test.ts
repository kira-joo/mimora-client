import { describe, expect, it } from "vitest";
import type { DeliveryZone, FulfilmentSettings } from "@/lib/api/types";
import en from "@/i18n/locales/en/common.json";
import { paymentMethodName, storeAssurances } from "./assurances";

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
  it("spans a zone's own earliest-to-latest range — Cairo 3–5 is not '5 days'", () => {
    expect(storeAssurances("en", t, fulfilment, [{ leadDaysMin: 3, leadDays: 5 } as DeliveryZone], []).delivery).toBe('deliveryLine:{"min":"3","max":"5"}');
    expect(storeAssurances("en", t, fulfilment, [{ leadDaysMin: 3, leadDays: 5 } as DeliveryZone, zone(2)], []).delivery).toBe('deliveryLine:{"min":"2","max":"5"}');
  });
  it("says nothing without zones or with delivery off", () => {
    expect(storeAssurances("en", t, fulfilment, [], []).delivery).toBeUndefined();
    expect(storeAssurances("en", t, { ...fulfilment, deliveryEnabled: false }, [zone(2)], []).delivery).toBeUndefined();
  });
  it("ships the exact-window message in the catalogue, with a plural selector", () => {
    expect(en.deliveryLineExact).toContain("plural");
  });
});

describe("paymentMethodName", () => {
  it("names every configured Mimora method, and shows an unknown key as configured", () => {
    expect(["COD", "INSTAPAY", "VODAFONE_CASH", "WALLET", "BANK"].map((method) => paymentMethodName(method, t))).toEqual(["paymentCOD:{}", "paymentInstapay:{}", "paymentVodafoneCash:{}", "paymentWallet:{}", "BANK"]);
  });
});

describe("storeAssurances — returns line", () => {
  it("states the problem-reporting window in hours: one day is 24 hours, never a 14-day return promise", () => {
    expect(storeAssurances("en", t, { ...fulfilment, returnWindowDays: 1 }, [], []).returns).toBe('returnsLine:{"hours":"24"}');
    expect(storeAssurances("en", t, { ...fulfilment, returnWindowDays: 0 }, [], []).returns).toBeUndefined();
  });
});
