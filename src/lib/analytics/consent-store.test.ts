import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_STORAGE_KEY, CONSENT_VERSION } from "./consent";
import { onConsentSettingsOpen, openConsentSettings, readConsent, subscribeConsent, writeConsent } from "./consent-store";
import { track } from "./track";
import { viewItem } from "./events";

beforeEach(() => {
  window.localStorage.clear();
  delete (window as unknown as { dataLayer?: unknown[] }).dataLayer;
});
afterEach(() => vi.restoreAllMocks());

describe("consent store (browser)", () => {
  it("starts unset, then reflects a written choice and notifies subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeConsent(listener);
    expect(readConsent()).toEqual({ status: "unset" });
    writeConsent("granted");
    expect(readConsent().status).toBe("granted");
    expect(listener).toHaveBeenCalledTimes(1);
    writeConsent("denied");
    expect(readConsent().status).toBe("denied");
    unsubscribe();
    writeConsent("granted");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("returns the same object until the stored value changes (a stable snapshot for React)", () => {
    writeConsent("granted");
    expect(readConsent()).toBe(readConsent());
  });

  it("persists in first-party storage with the version, so a version bump re-asks", () => {
    writeConsent("granted");
    expect(JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY)!)).toMatchObject({ v: CONSENT_VERSION, analytics: true });
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: CONSENT_VERSION - 1, analytics: true, at: new Date().toISOString() }));
    expect(readConsent()).toEqual({ status: "unset" });
  });

  it("a choice made in another tab (storage event) is picked up", () => {
    const listener = vi.fn();
    subscribeConsent(listener);
    window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_STORAGE_KEY }));
    expect(listener).toHaveBeenCalled();
  });

  it("blocked storage is not an error: the choice holds for this page view and never defaults to granted", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => writeConsent("denied")).not.toThrow();
    expect(readConsent().status).toBe("denied");
  });

  it("the footer's 'Cookie settings' opens the notice again", () => {
    const listener = vi.fn();
    const off = onConsentSettingsOpen(listener);
    openConsentSettings();
    expect(listener).toHaveBeenCalledOnce();
    off();
  });
});

describe("track (bound to the browser)", () => {
  it("pushes nothing before consent, and pushes after it — reading the live choice", () => {
    const layer = () => (window as unknown as { dataLayer?: unknown[] }).dataLayer;
    expect(track(viewItem("p1"))).toBe(false);
    expect(layer()).toBeUndefined();
    writeConsent("granted");
    expect(track(viewItem("p2"))).toBe(true);
    expect(layer()).toEqual([{ event: "view_item", items: [{ item_id: "p2" }] }]);
    writeConsent("denied");
    expect(track(viewItem("p3"))).toBe(false);
    expect(layer()).toHaveLength(1);
  });
});
