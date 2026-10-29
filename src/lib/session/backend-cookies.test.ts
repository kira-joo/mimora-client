import { describe, expect, it } from "vitest";
import { backendCookieHeader, isDeletion, parseSetCookie, sessionChangeFrom } from "./backend-cookies";

const NOW = Date.parse("2026-10-13T10:00:00Z");

describe("backend cookie translation", () => {
  it("parses a Set-Cookie with an Expires date that contains a comma", () => {
    const parsed = parseSetCookie("store_customer_session=abc.def.ghi; Path=/; Expires=Tue, 13 Oct 2026 10:15:00 GMT; Max-Age=900; HttpOnly; SameSite=lax");
    expect(parsed).toMatchObject({ name: "store_customer_session", value: "abc.def.ghi", maxAge: 900 });
  });

  it("reads a login: access + refresh issued, nothing cleared", () => {
    const change = sessionChangeFrom(
      ["store_customer_session=A; Path=/; Max-Age=900; HttpOnly", "store_customer_refresh=R; Path=/api/shop/auth; Max-Age=2592000; HttpOnly", "store_customer_marker=1; Path=/; Max-Age=2592000"],
      NOW
    );
    expect(change).toEqual({ cleared: false, session: { value: "A", maxAge: 900 }, refresh: { value: "R", maxAge: 2592000 } });
  });

  it("reads a logout as a clear — whether by Max-Age=0, an empty value or a past Expires", () => {
    expect(sessionChangeFrom(["store_customer_session=; Path=/; Max-Age=0"], NOW)?.cleared).toBe(true);
    expect(sessionChangeFrom(["store_customer_refresh=x; Path=/api/shop/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT"], NOW)?.cleared).toBe(true);
    expect(isDeletion({ name: "a", value: "" }, NOW)).toBe(true);
  });

  it("ignores cookies that are not the customer session (and reports no change)", () => {
    expect(sessionChangeFrom(["something_else=1; Path=/"], NOW)).toBeNull();
    expect(sessionChangeFrom([], NOW)).toBeNull();
  });

  it("builds the backend Cookie header only from what is held", () => {
    expect(backendCookieHeader({ session: "A" })).toBe("store_customer_session=A");
    expect(backendCookieHeader({ session: "A", refresh: "R" })).toBe("store_customer_session=A; store_customer_refresh=R");
    expect(backendCookieHeader({})).toBeUndefined();
  });
});
