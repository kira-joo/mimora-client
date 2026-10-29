"use client";

import { useState } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { apiMessage, fieldErrors } from "@/lib/api/errors";
import { newIdempotencyKey, sessionApi } from "@/lib/api/session-client";
import { SessionEndpoints } from "@/lib/api/session.endpoints";
import { formatNumber } from "@/lib/format/numerals";
import { useOrder } from "@/lib/order/use-order";
import type { Locale } from "@/i18n/routing";
import { isCompletedStatus } from "@/lib/order/order-progress";

type Condition = "unused" | "opened" | "damaged";

/**
 * Request a return (MDS §14 — "requested per line, within the return window").
 * Only for a completed order (delivered, or collected for a pickup). The customer chooses which lines and how many,
 * one reason, and each item's condition; the backend decides eligibility (the
 * window, quantities already returned) and its refusal is shown as it words it.
 * One Idempotency-Key per submission — a double tap opens one return.
 */
export function ReturnRequest({ orderNumber }: { orderNumber: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const queryClient = useQueryClient();
  const order = useOrder(orderNumber);
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Record<string, { quantity: number; condition: Condition }>>({});
  const [reason, setReason] = useState("");
  const [key, setKey] = useState(() => newIdempotencyKey());
  const request = useMutation({
    mutationFn: () =>
      sessionApi().request(SessionEndpoints.requestReturn, {
        body: { orderNumber, reason: reason.trim(), lines: Object.entries(chosen).map(([orderLineId, line]) => ({ orderLineId, quantity: line.quantity, reason: reason.trim(), condition: t(`condition_${line.condition}`) })) },
        headers: { "Idempotency-Key": key },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account", "returns"] }),
    onError: () => setKey(newIdempotencyKey()),
  });

  // Completed means delivered, or collected for a pickup.
  if (!order.data || !isCompletedStatus(order.data.status)) return null;
  const lines = order.data.lines;
  const selected = Object.keys(chosen).length;

  if (request.isSuccess) {
    return (
      <section className="container-sf pb-10" role="status">
        <div className="flex items-start gap-3 border border-line-strong bg-surface p-5">
          <CheckCircle2 className="mt-0.5 size-5 flex-none text-positive" aria-hidden="true" />
          <div className="flex flex-col gap-2">
            <p className="font-semibold">{t("returnRequested", { number: request.data.returnNumber })}</p>
            <p className="text-ink-secondary">{t("returnRequestedBody")}</p>
            <Link href="/account/returns" className="self-start font-medium text-action underline underline-offset-4">
              {t("viewReturns")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!open) {
    return (
      <section className="container-sf pb-10">
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
          {t("requestReturn")}
        </button>
      </section>
    );
  }

  const errors = fieldErrors(request.error);
  const failure = request.isError && !Object.keys(errors).length ? apiMessage(request.error) ?? t("returnFailed") : null;
  return (
    <section className="container-sf pb-10" aria-labelledby="return-heading">
      <form
        noValidate
        className="flex flex-col gap-5 border border-line-strong bg-surface p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (selected && reason.trim()) request.mutate();
        }}
      >
        <h2 id="return-heading" className="t-heading">
          {t("requestReturn")}
        </h2>
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 font-semibold">{t("returnWhichItems")}</legend>
          {lines.map((line) => {
            const current = chosen[line.orderLineId];
            return (
              <div key={line.orderLineId} className="flex flex-col gap-3 border-t border-line pt-3">
                <label className="flex min-h-11 cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-5 flex-none accent-[var(--sf-action)]"
                    checked={Boolean(current)}
                    onChange={(event) =>
                      setChosen(({ [line.orderLineId]: _drop, ...rest }) => (event.target.checked ? { ...rest, [line.orderLineId]: { quantity: line.quantity, condition: "unused" } } : rest))
                    }
                  />
                  <span>
                    <span className="font-medium">{line.productName}</span>
                    {line.variantDescription ? <span className="block text-[0.875rem] text-ink-secondary">{line.variantDescription}</span> : null}
                  </span>
                </label>
                {current ? (
                  <div className="flex flex-wrap gap-4 ps-8">
                    <label className="flex flex-col gap-1 text-[0.875rem]">
                      {t("quantity")}
                      <select className="field min-w-24" value={current.quantity} onChange={(event) => setChosen((all) => ({ ...all, [line.orderLineId]: { ...current, quantity: Number(event.target.value) } }))}>
                        {Array.from({ length: line.quantity }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {formatNumber(locale, n)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-[0.875rem]">
                      {t("returnCondition")}
                      <select className="field min-w-40" value={current.condition} onChange={(event) => setChosen((all) => ({ ...all, [line.orderLineId]: { ...current, condition: event.target.value as Condition } }))}>
                        {(["unused", "opened", "damaged"] as const).map((condition) => (
                          <option key={condition} value={condition}>
                            {t(`condition_${condition}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}
              </div>
            );
          })}
        </fieldset>
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.9375rem] font-medium">{t("returnReason")}</span>
          <textarea className="field min-h-24 py-3" maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} aria-invalid={errors.reason ? true : undefined} />
          {errors.reason ? <span className="text-[0.875rem] font-medium text-critical">{errors.reason}</span> : null}
        </label>
        {failure ? (
          <p role="alert" className="flex items-start gap-1.5 text-[0.9375rem] font-medium text-critical">
            <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
            {failure}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn btn-primary" disabled={!selected || !reason.trim() || request.isPending}>
            {request.isPending ? t("sending") : t("submitReturn")}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
            {t("cancelNo")}
          </button>
        </div>
      </form>
    </section>
  );
}
