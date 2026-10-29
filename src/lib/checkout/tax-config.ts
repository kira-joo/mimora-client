import "server-only";
import type { FulfilmentSettings } from "@/lib/api/types";
import { taxModeOf } from "./tax-label";

/**
 * A summary with no known tax mode shows NO tax line (never an assumed
 * "included") — and says so in the log, once per render that hit it. Without
 * this the absence is indistinguishable from a store that charges no tax: the
 * same silent-no-op shape the workspace's verification rule exists for.
 */
export function warnIfTaxModeUnknown(settings: FulfilmentSettings | null, where: string): void {
  if (taxModeOf(settings) === null) console.error(`[tax] ${where}: fulfilment settings carry no recognised tax mode (settings ${settings ? "present but unrecognised" : "unavailable"}) — the tax line is withheld rather than guessed.`);
}
