import { isApiError } from "@kira-joo/frontend-toolkit-core/server";
import type { ApiError } from "@kira-joo/toolkit-common";

/*
 * One error shape (04 §3): the toolkit's normalised `ApiError`. These read it;
 * nothing here invents a second model.
 */
export function apiStatus(error: unknown): number | undefined {
  return isApiError(error) ? (error as ApiError).statusCode : undefined;
}

/** Field-level messages for a form, keyed by the backend's dotted field path (`address.city`). */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!isApiError(error)) return {};
  const result: Record<string, string> = {};
  for (const item of (error as ApiError).validationErrors ?? []) result[item.field] = item.message;
  return result;
}

/** The backend's own message when it wrote one for a person (409s name the reason); otherwise undefined so the caller words it. */
export function apiMessage(error: unknown): string | undefined {
  if (!isApiError(error)) return undefined;
  const { message, statusCode } = error as ApiError;
  return statusCode && statusCode < 500 && message && message !== "Validation failed" ? message : undefined;
}

/** The backend's structured `details` (e.g. `{ field, reason: "TERMS_VERSION_CHANGED" }`), wherever normalisation kept it. */
export function apiDetails(error: unknown): { field?: string; reason?: string; [key: string]: unknown } | undefined {
  const candidate = error as { details?: unknown; raw?: { details?: unknown } } | null;
  const details = candidate?.details ?? candidate?.raw?.details;
  return details && typeof details === "object" ? (details as { field?: string; reason?: string }) : undefined;
}
