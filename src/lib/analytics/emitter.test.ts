import { describe, expect, it, vi } from "vitest";
import { parseConsent, serializeConsent, type ConsentState } from "./consent";
import { createEmitter } from "./emitter";
import { addToCart, purchase, viewItem, type AnalyticsEvent } from "./events";

const granted = parseConsent(serializeConsent("granted"));
const denied = parseConsent(serializeConsent("denied"));
const unset: ConsentState = { status: "unset" };

function setup(initial: ConsentState, dev = false) {
  let consent = initial;
  const target: { dataLayer?: unknown[] } = {};
  const log = { info: vi.fn(), error: vi.fn() };
  const track = createEmitter({ consent: () => consent, target: () => target, dev, log });
  return { track, target, log, set: (next: ConsentState) => (consent = next) };
}

describe("emitter — consent gating", () => {
  it("pushes to window.dataLayer once consent is granted, as { event, ...params }", () => {
    const { track, target } = setup(granted);
    expect(track(addToCart({ productId: "p1", variantId: "v1", quantity: 2 }))).toBe(true);
    expect(target.dataLayer).toEqual([{ event: "add_to_cart", items: [{ item_id: "p1", item_variant: "v1", quantity: 2 }] }]);
  });

  it.each([["unset", unset], ["declined", denied]])("is a no-op while consent is %s — nothing pushed, and dataLayer is not even created", (_name, state) => {
    const { track, target } = setup(state);
    expect(track(viewItem("p1"))).toBe(false);
    expect(target.dataLayer).toBeUndefined();
  });

  it("reads consent on every event: a choice made — or withdrawn — applies to the very next one", () => {
    const { track, target, set } = setup(unset);
    track(viewItem("a"));
    set(granted);
    track(viewItem("b"));
    set(denied);
    track(viewItem("c"));
    expect(target.dataLayer).toEqual([{ event: "view_item", items: [{ item_id: "b" }] }]);
  });

  it("announces itself OFF in development — once — and stays silent in production", () => {
    const dev = setup(unset, true);
    dev.track(viewItem("a"));
    dev.track(viewItem("b"));
    expect(dev.log.info).toHaveBeenCalledTimes(1);
    expect(dev.log.info.mock.calls[0]![0]).toMatch(/OFF/);

    const production = setup(unset, false);
    production.track(viewItem("a"));
    expect(production.log.info).not.toHaveBeenCalled();
  });

  it("does not announce OFF when analytics is on", () => {
    const { track, log } = setup(granted, true);
    track(viewItem("a"));
    expect(log.info).not.toHaveBeenCalled();
  });

  it("does nothing during server rendering (no window)", () => {
    const track = createEmitter({ consent: () => granted, target: () => undefined, dev: false });
    expect(track(viewItem("a"))).toBe(false);
  });

  it("refuses an event that carries personal data, even with consent — and says so in development", () => {
    const { track, target, log } = setup(granted, true);
    const leaky = { name: "purchase", params: { transaction_id: "ORD-1", value: "1.00", currency: "EGP", item_count: 1, email: "mona@example.com" } } as unknown as AnalyticsEvent;
    expect(track(leaky)).toBe(false);
    expect(target.dataLayer).toBeUndefined();
    expect(log.error).toHaveBeenCalledOnce();
    // The honest version of the same event goes through.
    expect(track(purchase({ orderNumber: "ORD-1", total: "1.00", currency: "EGP", itemCount: 1 }))).toBe(true);
  });
});
