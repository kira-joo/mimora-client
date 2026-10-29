import { describe, expect, it } from "vitest";
import { safeRedirect } from "./safe-redirect";

describe("safeRedirect", () => {
  it("keeps same-origin paths, minus the locale", () => {
    expect(safeRedirect("/ar/account/orders?x=1")).toBe("/account/orders?x=1");
    expect(safeRedirect("/checkout")).toBe("/checkout");
    expect(safeRedirect("/en")).toBe("/");
  });

  it("refuses anything that could leave the store", () => {
    for (const hostile of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", undefined]) {
      expect(safeRedirect(hostile)).toBe("/account");
    }
  });
});
