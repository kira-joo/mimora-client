import { describe, expect, it } from "vitest";
import { ENV_VARS, EnvironmentConfigurationError, assertBuildEnvironment, assertProductionEnvironment, siteUrlProblem, validateEnvironment } from "./env-validation";

const REQUIRED = { STAFF_API_URL: "https://backend.example", STORE_ID: "store-a", SITE_URL: "https://shop.example", STORE_TIMEZONE: "Africa/Cairo" };
const prod = (env: Record<string, string | undefined>) => validateEnvironment(env, { production: true });

describe("required variables", () => {
  it("a minimal valid production environment has no problems and no notices", () => {
    expect(prod(REQUIRED)).toEqual({ problems: [], notices: [] });
  });

  it.each(Object.keys(REQUIRED))("%s missing or blank is a problem that names it", (name) => {
    for (const value of [undefined, "", "  "]) {
      const { problems } = prod({ ...REQUIRED, [name]: value });
      expect(problems).toEqual([`${name}: is not set`]);
    }
  });

  it("SITE_URL must be https in production and carry no query, but may be http in development", () => {
    expect(prod({ ...REQUIRED, SITE_URL: "http://shop.example" }).problems).toEqual(["SITE_URL: must be https in production"]);
    expect(prod({ ...REQUIRED, SITE_URL: "https://shop.example/?x=1" }).problems[0]).toMatch(/query string/);
    expect(prod({ ...REQUIRED, SITE_URL: "shop.example" }).problems[0]).toMatch(/absolute URL/);
    expect(validateEnvironment({ ...REQUIRED, SITE_URL: "http://localhost:3030" }, { production: false }).problems).toEqual([]);
  });

  it("STORE_ID missing in production is a required problem; it is never a secret", () => {
    expect(prod({ ...REQUIRED, STORE_ID: undefined }).problems).toEqual(["STORE_ID: is not set"]);
    expect(() => assertProductionEnvironment({ ...REQUIRED, STORE_ID: undefined }, "production")).toThrow(/STORE_ID: is not set/);
    expect(ENV_VARS.find((spec) => spec.name === "STORE_ID")).toMatchObject({ requirement: "required", secret: false });
  });

  it.each(["Store-A", "-a", "a-", "store a", "store_a", "a".repeat(41), "المتجر", "a/b"])("a malformed STORE_ID (%s) is refused", (value) => {
    expect(prod({ ...REQUIRED, STORE_ID: value }).problems[0]).toMatch(/^STORE_ID: must be a lowercase slug/);
  });

  it.each(["a", "7", "store-a", "store-fixture-b", "a-b-c", "a".repeat(40)])("a valid STORE_ID (%s) is accepted", (value) => {
    expect(prod({ ...REQUIRED, STORE_ID: value }).problems).toEqual([]);
  });

  it("a production BUILD does not require STORE_ID (only SITE_URL is baked in)", () => {
    expect(() => assertBuildEnvironment({ SITE_URL: "https://shop.example" }, "production")).not.toThrow();
  });

  it("STORE_TIMEZONE is validated through Intl", () => {
    expect(prod({ ...REQUIRED, STORE_TIMEZONE: "Not/AZone" }).problems[0]).toMatch(/STORE_TIMEZONE.*IANA/);
  });

  it("STAFF_API_URL must be an http(s) URL; plain http is allowed but advised against", () => {
    expect(prod({ ...REQUIRED, STAFF_API_URL: "backend:3040" }).problems[0]).toMatch(/STAFF_API_URL/);
    const report = prod({ ...REQUIRED, STAFF_API_URL: "http://backend.internal:3040" });
    expect(report.problems).toEqual([]);
    expect(report.notices[0]?.message).toMatch(/STAFF_API_URL is plain http/);
  });
});

describe("capability and optional variables are never fatal", () => {
  it("REVALIDATE_SECRET absent is silent here (startup-check announces OFF)", () => {
    expect(prod(REQUIRED).notices).toEqual([]);
  });

  it("a weak or placeholder REVALIDATE_SECRET is an error notice", () => {
    expect(prod({ ...REQUIRED, REVALIDATE_SECRET: "short" })).toMatchObject({ problems: [], notices: [{ level: "error" }] });
    expect(prod({ ...REQUIRED, REVALIDATE_SECRET: "replace-with-at-least-32-random-characters" }).notices[0]?.message).toMatch(/placeholder/);
    expect(prod({ ...REQUIRED, REVALIDATE_SECRET: "r".repeat(40) }).notices).toEqual([]);
  });

  it("flags the design preview left on in production and a malformed TRUST_X_REAL_IP", () => {
    const text = prod({ ...REQUIRED, DESIGN_PREVIEW: "1", TRUST_X_REAL_IP: "yes" }).notices.map((notice) => notice.message).join("\n");
    expect(text).toMatch(/DESIGN_PREVIEW is on/);
    expect(text).toMatch(/TRUST_X_REAL_IP must be 1/);
  });

  it("flags a NEXT_PUBLIC_ variable that would leak the backend's origin to the browser", () => {
    const report = prod({ ...REQUIRED, NEXT_PUBLIC_SHOP_API_URL: "https://backend.example" });
    expect(report.problems).toEqual([]);
    expect(report.notices[0]?.message).toMatch(/NEXT_PUBLIC_SHOP_API_URL is set/);
  });
});

describe("no value ever reaches a message", () => {
  it("none of the values in a bad environment appears in the report or the error", () => {
    const bad = { STAFF_API_URL: "ftp://user:Sup3rSecretPw@backend", SITE_URL: "http://user:Sup3rSecretPw@shop", STORE_ID: "Sup3rSecretId", STORE_TIMEZONE: "Sup3rSecretZone", REVALIDATE_SECRET: "Sup3rSecretReval" };
    const report = prod(bad);
    const printed = JSON.stringify(report) + new EnvironmentConfigurationError(report.problems).message;
    expect(printed).not.toContain("Sup3rSecret");
    expect(report.problems).toHaveLength(4);
  });
});

describe("assertProductionEnvironment", () => {
  it("throws in production listing each problem by name", () => {
    expect(() => assertProductionEnvironment({}, "production")).toThrow(/STAFF_API_URL: is not set[\s\S]*SITE_URL: is not set[\s\S]*STORE_TIMEZONE: is not set/);
  });

  it("does nothing outside production", () => {
    expect(() => assertProductionEnvironment({}, "development")).not.toThrow();
    expect(() => assertProductionEnvironment({}, undefined)).not.toThrow();
  });
});

describe("assertBuildEnvironment — SITE_URL throws at production build", () => {
  it("throws when SITE_URL is missing, blank, malformed or http", () => {
    for (const SITE_URL of [undefined, "", "nope", "http://shop.example"]) {
      expect(() => assertBuildEnvironment({ SITE_URL }, "production")).toThrow(EnvironmentConfigurationError);
    }
    expect(() => assertBuildEnvironment({}, "production")).toThrow(/SITE_URL: is not set/);
  });

  it("passes with a good SITE_URL and checks nothing else (a build has no backend)", () => {
    expect(() => assertBuildEnvironment({ SITE_URL: "https://shop.example" }, "production")).not.toThrow();
  });

  it("does not run outside production", () => {
    expect(() => assertBuildEnvironment({}, "development")).not.toThrow();
  });
});

describe("STAFF_API_URL advisory", () => {
  it("is silent for a loopback backend in production (a local production run) and speaks for a real plain-http host", () => {
    const loopback = prod({ ...REQUIRED, STAFF_API_URL: "http://localhost:3140" });
    expect(loopback.notices.filter((notice) => notice.message.includes("STAFF_API_URL"))).toEqual([]);
    const remote = prod({ ...REQUIRED, STAFF_API_URL: "http://api.internal:3140" });
    expect(remote.notices.map((notice) => notice.message).join("\n")).toMatch(/STAFF_API_URL is plain http/);
  });
});

describe("siteUrlProblem", () => {
  it("allows plain http in production only for a loopback origin (a local production build), never a real host", () => {
    expect(siteUrlProblem("http://localhost:3130", true)).toBeNull();
    expect(siteUrlProblem("http://127.0.0.1:3130", true)).toBeNull();
    expect(siteUrlProblem("http://shop.example", true)).toBe("must be https in production");
    expect(siteUrlProblem("http://localhost.example.com", true)).toBe("must be https in production");
  });

  it("accepts a trailing slash (siteOrigin strips it)", () => {
    expect(siteUrlProblem("https://shop.example/", true)).toBeNull();
  });
});

describe("the table", () => {
  it("has unique names and marks REVALIDATE_SECRET secret", () => {
    const names = ENV_VARS.map((spec) => spec.name);
    expect(new Set(names).size).toBe(names.length);
    expect(ENV_VARS.find((spec) => spec.name === "REVALIDATE_SECRET")?.secret).toBe(true);
    expect(ENV_VARS.find((spec) => spec.name === "STAFF_API_URL")?.secret).toBe(false);
  });
});
