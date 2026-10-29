import { beforeEach, describe, expect, it } from "vitest";
import { loginHrefAfterSignup, takeSignupPhone } from "./signup-handoff";

describe("signup → login handoff", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("keeps the phone out of the URL, flags the notice and preserves redirectTo", () => {
    const href = loginHrefAfterSignup("+201005550001", "/checkout");
    expect(href).toEqual({ pathname: "/login", query: { registered: "1", redirectTo: "/checkout" } });
    expect(JSON.stringify(href)).not.toContain("201005550001");
  });

  it("omits redirectTo when there was none", () => {
    expect(loginHrefAfterSignup("0100", null).query).toEqual({ registered: "1" });
  });

  it("hands the phone over once, through sessionStorage", () => {
    loginHrefAfterSignup("+201005550001", null);
    expect(takeSignupPhone()).toBe("+201005550001");
    expect(takeSignupPhone()).toBe("");
  });
});
