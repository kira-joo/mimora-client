import { afterEach, describe, expect, it, vi } from "vitest";

const announceBackendIdentity = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("@/lib/config/backend-identity", () => ({ announceBackendIdentity }));

import { register } from "./instrumentation";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  announceBackendIdentity.mockClear();
});

const stub = (env: Record<string, string>) => {
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
};
const GOOD = { STAFF_API_URL: "https://backend.example", SITE_URL: "https://shop.example", STORE_ID: "store-a", STORE_TIMEZONE: "Africa/Cairo", REVALIDATE_SECRET: "r".repeat(40) };

describe("register()", () => {
  it("a production BUILD without SITE_URL throws; the backend need not be configured", async () => {
    stub({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build", SITE_URL: "", STAFF_API_URL: "" });
    await expect(register()).rejects.toThrow(/at build[\s\S]*SITE_URL: is not set/);
  });

  it("a production build with SITE_URL set passes without a backend or a STORE_ID, and never verifies the backend", async () => {
    stub({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build", SITE_URL: "https://shop.example", STAFF_API_URL: "", STORE_ID: "" });
    await expect(register()).resolves.toBeUndefined();
    expect(announceBackendIdentity).not.toHaveBeenCalled();
  });

  it("a production BOOT missing a required variable throws, naming it", async () => {
    stub({ NODE_ENV: "production", NEXT_PHASE: "phase-production-server", ...GOOD, STAFF_API_URL: "" });
    await expect(register()).rejects.toThrow(/STAFF_API_URL: is not set/);
    expect(announceBackendIdentity).not.toHaveBeenCalled();
  });

  it("a production BOOT without a STORE_ID, or with a malformed one, throws, naming it", async () => {
    stub({ NODE_ENV: "production", NEXT_PHASE: "phase-production-server", ...GOOD, STORE_ID: "" });
    await expect(register()).rejects.toThrow(/STORE_ID: is not set/);
    stub({ STORE_ID: "Not A Slug" });
    await expect(register()).rejects.toThrow(/STORE_ID: must be a lowercase slug/);
    expect(announceBackendIdentity).not.toHaveBeenCalled();
  });

  it("a production boot without REVALIDATE_SECRET still starts, and announces invalidation OFF once", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    stub({ NODE_ENV: "production", NEXT_PHASE: "phase-production-server", ...GOOD, REVALIDATE_SECRET: "" });
    await expect(register()).resolves.toBeUndefined();
    expect(error.mock.calls.filter(([line]) => /invalidation is OFF/.test(String(line)))).toHaveLength(1);
  });

  it("a complete production boot is silent and attempts the backend identity check once", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    stub({ NODE_ENV: "production", NEXT_PHASE: "phase-production-server", NEXT_RUNTIME: "nodejs", ...GOOD });
    await register();
    expect(error).not.toHaveBeenCalled();
    expect(announceBackendIdentity).toHaveBeenCalledTimes(1);
  });

  it("the Edge runtime never attempts the identity check (it needs node:http)", async () => {
    stub({ NODE_ENV: "production", NEXT_PHASE: "phase-production-server", NEXT_RUNTIME: "edge", ...GOOD });
    await register();
    expect(announceBackendIdentity).not.toHaveBeenCalled();
  });

  it("outside production nothing is checked", async () => {
    stub({ NODE_ENV: "development", SITE_URL: "", STAFF_API_URL: "" });
    await expect(register()).resolves.toBeUndefined();
    expect(announceBackendIdentity).not.toHaveBeenCalled();
  });
});
