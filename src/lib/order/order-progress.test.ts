import { describe, expect, it } from "vitest";
import type { OrderStatus } from "@/lib/api/types";
import { isCompletedStatus, progressSteps } from "./order-progress";

const states = (status: OrderStatus, mode: "DELIVERY" | "PICKUP") => progressSteps(status, mode).map((step) => `${step.status}:${step.state}`);

describe("progressSteps", () => {
  it("walks a delivery: placed → confirmed → processing → dispatched → in transit → delivered", () => {
    expect(progressSteps("PLACED", "DELIVERY").map((step) => step.status)).toEqual(["PLACED", "CONFIRMED", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED"]);
  });

  it("walks a pickup: placed → confirmed → processing → ready → collected", () => {
    expect(progressSteps("PLACED", "PICKUP").map((step) => step.status)).toEqual(["PLACED", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "COLLECTED"]);
  });

  it("marks what is behind as done, where the order is as current, and the rest as upcoming", () => {
    expect(states("PROCESSING", "DELIVERY")).toEqual(["PLACED:done", "CONFIRMED:done", "PROCESSING:current", "SHIPPED:upcoming", "IN_TRANSIT:upcoming", "DELIVERED:upcoming"]);
    expect(states("READY_FOR_PICKUP", "PICKUP")).toEqual(["PLACED:done", "CONFIRMED:done", "PROCESSING:done", "READY_FOR_PICKUP:current", "COLLECTED:upcoming"]);
  });

  it("shows in transit as current once the parcel is moving, and dispatched as done", () => {
    expect(states("IN_TRANSIT", "DELIVERY").slice(3)).toEqual(["SHIPPED:done", "IN_TRANSIT:current", "DELIVERED:upcoming"]);
  });

  it("keeps the optional in-transit step visible and done for an order that went straight from dispatched to delivered", () => {
    expect(states("DELIVERED", "DELIVERY")).toEqual(["PLACED:done", "CONFIRMED:done", "PROCESSING:done", "SHIPPED:done", "IN_TRANSIT:done", "DELIVERED:done"]);
  });

  it("finishes a collected pickup — every step done", () => {
    expect(states("COLLECTED", "PICKUP").every((entry) => entry.endsWith(":done"))).toBe(true);
  });

  it("treats a pickup completed as DELIVERED before COLLECTED existed as finished too (no migration)", () => {
    expect(states("DELIVERED", "PICKUP")).toEqual(states("COLLECTED", "PICKUP"));
  });

  it("draws no progress for a cancelled order, or for a status it does not know", () => {
    expect(progressSteps("CANCELLED", "DELIVERY")).toEqual([]);
    expect(progressSteps("SOMETHING_NEW" as OrderStatus, "DELIVERY")).toEqual([]);
    // A delivery-only status on a pickup order is not on its journey.
    expect(progressSteps("SHIPPED", "PICKUP")).toEqual([]);
  });
});

describe("isCompletedStatus", () => {
  it("is DELIVERED and COLLECTED only", () => {
    const all: OrderStatus[] = ["PLACED", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "SHIPPED", "IN_TRANSIT", "DELIVERED", "COLLECTED", "CANCELLED"];
    expect(all.filter(isCompletedStatus)).toEqual(["DELIVERED", "COLLECTED"]);
  });
});
