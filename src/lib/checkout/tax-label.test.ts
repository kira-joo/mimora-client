import { describe, expect, it } from "vitest";
import { taxLine, taxModeOf } from "./tax-label";

describe("taxModeOf", () => {
  it("reads the configured mode", () => {
    expect(taxModeOf({ tax: { mode: "INCLUDED" } })).toBe("INCLUDED");
    expect(taxModeOf({ tax: { mode: "ADDED" } })).toBe("ADDED");
  });

  it("is null — never a default — when settings are missing or unrecognised", () => {
    expect(taxModeOf(null)).toBeNull();
    expect(taxModeOf(undefined)).toBeNull();
    expect(taxModeOf({})).toBeNull();
    expect(taxModeOf({ tax: {} })).toBeNull();
    expect(taxModeOf({ tax: { mode: "SOMETHING_NEW" } })).toBeNull();
  });
});

describe("taxLine", () => {
  it("ADDED is an additive row", () => {
    expect(taxLine("ADDED", "14.00")).toEqual({ kind: "added", amount: "14.00" });
  });

  it("INCLUDED is 'includes tax X', NOT an additive row", () => {
    expect(taxLine("INCLUDED", "14.00")).toEqual({ kind: "included", amount: "14.00" });
  });

  it("shows nothing when the mode is unknown — settings missing must not be assumed INCLUDED", () => {
    expect(taxLine(null, "14.00")).toEqual({ kind: "none" });
    expect(taxLine(undefined, "14.00")).toEqual({ kind: "none" });
  });

  it("shows nothing for zero tax in either mode, however the zero is written", () => {
    for (const zero of ["0", "0.00", "0.0", "", undefined]) {
      expect(taxLine("ADDED", zero)).toEqual({ kind: "none" });
      expect(taxLine("INCLUDED", zero)).toEqual({ kind: "none" });
    }
  });

  it("does not mistake a small non-zero amount for zero", () => {
    expect(taxLine("ADDED", "0.05")).toEqual({ kind: "added", amount: "0.05" });
    expect(taxLine("INCLUDED", "10")).toEqual({ kind: "included", amount: "10" });
  });
});
