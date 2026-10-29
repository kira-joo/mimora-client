import { describe, expect, it } from "vitest";
import { promotionStatus } from "./promotion-status";

const effect = { subtotalDiscount: "10", waivesShippingFee: false };

describe("promotionStatus", () => {
  it("says nothing when no code was entered (an automatic promotion speaks in the summary instead)", () => {
    expect(promotionStatus(undefined, { ...effect, code: "", automatic: true })).toBeNull();
  });
  it("applied only when the entered code is the one that applied, whatever its case", () => {
    expect(promotionStatus("save10", { ...effect, code: "SAVE10", automatic: false })).toBe("applied");
  });
  it("superseded when a better automatic offer applied instead of the entered code", () => {
    expect(promotionStatus("SAVE10", { ...effect, code: "", automatic: true, name: { en: "Free delivery", ar: "توصيل مجاني" } })).toBe("superseded");
  });
  it("not applicable when nothing applied", () => {
    expect(promotionStatus("SAVE10", undefined)).toBe("notApplicable");
  });
});
