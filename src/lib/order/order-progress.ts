import type { OrderStatus } from "@/lib/api/types";

/**
 * The order's journey as the customer reads it: placed → confirmed → processing → dispatched → in transit →
 * delivered for a delivery, and placed → confirmed → processing → ready → collected for a pickup (MDS §6.8).
 * "Dispatched" is the backend's `SHIPPED`; `IN_TRANSIT` is an optional step after it, so an order that went straight
 * from dispatched to delivered still shows it — behind the customer, not skipped over in silence.
 *
 * The step lists are DISPLAY, kept here once; which transitions are allowed is the backend's state machine.
 */
export type FulfilmentMode = "DELIVERY" | "PICKUP";
export type StepState = "done" | "current" | "upcoming";

const DELIVERY_STEPS: readonly OrderStatus[] = ["PLACED", "CONFIRMED", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED"];
const PICKUP_STEPS: readonly OrderStatus[] = ["PLACED", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "COLLECTED"];

/** A pickup order completed as DELIVERED before COLLECTED existed (no migration) is the same finished state. */
export function isCompletedStatus(status: OrderStatus): boolean {
  return status === "DELIVERED" || status === "COLLECTED";
}

/**
 * The steps for an order, each marked done, current or upcoming. Empty for a cancelled order: it is not on the
 * journey any more, and drawing a progress bar for it would imply it still is.
 */
export function progressSteps(status: OrderStatus, mode: FulfilmentMode): Array<{ status: OrderStatus; state: StepState }> {
  if (status === "CANCELLED") return [];
  const steps = mode === "PICKUP" ? PICKUP_STEPS : DELIVERY_STEPS;
  const position = isCompletedStatus(status) ? steps.length - 1 : steps.indexOf(status);
  // A status this list does not know (a newer backend) shows nothing rather than a wrong position.
  if (position === -1) return [];
  const completed = isCompletedStatus(status);
  return steps.map((step, index) => ({
    status: step,
    state: index < position || (completed && index === position) ? "done" : index === position ? "current" : "upcoming",
  }));
}
