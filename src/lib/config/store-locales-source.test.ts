import { describe, expect, it, vi } from "vitest";
import { FALLBACK_STORE_LOCALES } from "@/i18n/store-locales";
import { createStoreLocalesSource } from "./store-locales-source";

const setup = (readProfile: () => Promise<{ supportedLocales?: string[]; defaultLocale?: string }>) => {
  let clock = 1_000;
  const onFailure = vi.fn();
  const get = createStoreLocalesSource({ readProfile, ttlMs: 30_000, failureTtlMs: 5_000, now: () => clock, onFailure });
  return { get, onFailure, advance: (ms: number) => (clock += ms) };
};

describe("createStoreLocalesSource", () => {
  it("reads the profile once and serves the answer from cache within the TTL", async () => {
    const read = vi.fn(async () => ({ supportedLocales: ["en"], defaultLocale: "en" }));
    const { get, advance } = setup(read);

    expect(await get()).toEqual({ supported: ["en"], defaultLocale: "en" });
    advance(29_000);
    await get();
    await get();
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("re-reads after the TTL, so an owner's change reaches the proxy", async () => {
    const read = vi.fn().mockResolvedValueOnce({ supportedLocales: ["ar", "en"], defaultLocale: "ar" }).mockResolvedValueOnce({ supportedLocales: ["ar"], defaultLocale: "ar" });
    const { get, advance } = setup(read);

    expect((await get()).supported).toEqual(["ar", "en"]);
    advance(30_001);
    expect((await get()).supported).toEqual(["ar"]);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("a burst of concurrent requests makes ONE backend call (single flight)", async () => {
    let release!: (value: { supportedLocales: string[]; defaultLocale: string }) => void;
    const read = vi.fn(() => new Promise<{ supportedLocales: string[]; defaultLocale: string }>((resolve) => (release = resolve)));
    const { get } = setup(read);

    const burst = Promise.all([get(), get(), get(), get()]);
    release({ supportedLocales: ["en"], defaultLocale: "en" });
    const results = await burst;

    expect(read).toHaveBeenCalledTimes(1);
    expect(results.every((result) => result.defaultLocale === "en")).toBe(true);
  });

  it("fails OPEN: with no prior answer and a dead backend, every shipped locale applies", async () => {
    const { get, onFailure } = setup(async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(await get()).toEqual(FALLBACK_STORE_LOCALES);
    expect(onFailure).toHaveBeenCalledTimes(1);
  });

  it("a failed refresh keeps serving the last GOOD answer, not the fallback", async () => {
    const read = vi.fn().mockResolvedValueOnce({ supportedLocales: ["en"], defaultLocale: "en" }).mockRejectedValue(new Error("boom"));
    const { get, advance } = setup(read);

    await get();
    advance(30_001);
    expect(await get()).toEqual({ supported: ["en"], defaultLocale: "en" });
  });

  it("probes a dead backend rarely, not on every request", async () => {
    const read = vi.fn().mockRejectedValue(new Error("down"));
    const { get, advance } = setup(read);

    await get();
    advance(1_000);
    await get();
    await get();
    expect(read).toHaveBeenCalledTimes(1); // inside the failure TTL
    advance(5_000);
    await get();
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("recovers: after a failure the next successful read replaces the fallback", async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValue({ supportedLocales: ["en"], defaultLocale: "en" });
    const { get, advance } = setup(read);

    expect(await get()).toEqual(FALLBACK_STORE_LOCALES);
    advance(5_001);
    expect(await get()).toEqual({ supported: ["en"], defaultLocale: "en" });
  });

  it("an unusable profile (no supported locale we ship) resolves to the fallback, not an empty set", async () => {
    const { get } = setup(async () => ({ supportedLocales: ["fr"], defaultLocale: "fr" }));
    expect(await get()).toEqual(FALLBACK_STORE_LOCALES);
  });
});
