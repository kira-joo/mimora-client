import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { siteOrigin } from "./site-origin";

afterEach(() => vi.unstubAllEnvs());

const stub = (env: Record<string, string | undefined>) => {
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value as string);
};

describe("siteOrigin", () => {
  it("THROWS at a production build when SITE_URL is missing or unusable", () => {
    stub({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build", SITE_URL: "" });
    expect(() => siteOrigin()).toThrow(/SITE_URL: is not set/);
    stub({ SITE_URL: "http://shop.example" });
    expect(() => siteOrigin()).toThrow(/must be https/);
  });

  it("returns the origin without a trailing slash at a production build", () => {
    stub({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build", SITE_URL: "https://shop.example/" });
    expect(siteOrigin()).toBe("https://shop.example");
  });

  it("a running production server with it unset returns null rather than throwing in a request", () => {
    stub({ NODE_ENV: "production", NEXT_PHASE: "phase-production-server", SITE_URL: "" });
    expect(siteOrigin()).toBeNull();
  });

  it("falls back to the local dev server in development", () => {
    stub({ NODE_ENV: "development", SITE_URL: "" });
    expect(siteOrigin()).toBe("http://localhost:3030");
  });
});
