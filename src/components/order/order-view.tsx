"use client";

import { useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Copy, ExternalLink, FileText, MapPin, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Link } from "@/i18n/navigation";
import { useCurrency, useStore } from "@/components/providers/store-context";
import { apiMessage, apiStatus, fieldErrors } from "@/lib/api/errors";
import type { OrderDetail, OrderStatus, PaymentStatus } from "@/lib/api/types";
import { paymentMethodName } from "@/lib/catalog/assurances";
import { taxLine, type TaxMode } from "@/lib/checkout/tax-label";
import { TaxAddedRow, TaxIncludesNote } from "@/components/checkout/tax-rows";
import { formatDate, formatNumber, formatOrderNumber, formatPhone, formatPrice, formatTracking, localized } from "@/lib/format/numerals";
import { isCompletedStatus, progressSteps } from "@/lib/order/order-progress";
import { newIdempotencyKey, useCancelOrder, useOrder, useUploadProof } from "@/lib/order/use-order";
import { useStatusLabel } from "@/lib/order/use-order-labels";
import type { Locale } from "@/i18n/routing";

const DATE_ONLY: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "long" };
const STATUS_TONE: Record<OrderStatus, string> = { PLACED: "text-ink", CONFIRMED: "text-ink", PROCESSING: "text-ink", READY_FOR_PICKUP: "text-positive", SHIPPED: "text-ink", IN_TRANSIT: "text-ink", DELIVERED: "text-positive", COLLECTED: "text-positive", CANCELLED: "text-critical" };
const PAYMENT_TONE: Record<PaymentStatus, string> = { NOT_REQUIRED: "text-ink-secondary", AWAITING_PAYMENT: "text-caution", SUBMITTED: "text-ink", VERIFIED: "text-positive", REJECTED: "text-critical", REFUNDED: "text-ink-secondary" };

/**
 * The order, as the customer sees it (MDS §6.8, §14) — and, with no email
 * provider (D-8), the confirmation page IS the confirmation. Order status and
 * payment status are two separate signals (a COD order progresses unpaid). The
 * promised window is a date range. For a transfer method, the destination and
 * the exact amount — the ORDER'S snapshot, what was agreed — with the proof
 * upload; a rejected proof reopens with the staff reason (MDS §13).
 */
export function OrderView({ orderNumber, token, justPlaced, taxMode = null }: { orderNumber: string; token?: string; justPlaced: boolean; taxMode?: TaxMode | null }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const order = useOrder(orderNumber, token);

  if (order.isLoading) return <div className="container-sf my-10 h-[60vh] animate-pulse bg-surface-muted motion-reduce:animate-none" aria-busy="true" />;
  if (order.isError || !order.data) {
    const status = apiStatus(order.error);
    return (
      <div className="container-sf flex max-w-2xl flex-col items-start gap-4 py-20">
        <h1 className="t-title">{status === 404 || status === 401 ? t("orderNotFoundTitle") : t("orderUnavailableTitle")}</h1>
        <p className="text-ink-secondary">{status === 404 || status === 401 ? t("orderNotFoundBody") : t("cartUnavailableBody")}</p>
        <Link href="/" className="btn btn-secondary">
          {t("backToShop")}
        </Link>
      </div>
    );
  }
  return <OrderDetailView order={order.data} token={token} justPlaced={justPlaced} taxMode={taxMode} />;
}

export function OrderDetailView({ order, token, justPlaced, taxMode }: { order: OrderDetail; token?: string; justPlaced: boolean; taxMode: TaxMode | null }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const td = useTranslations("common.orderDocs");
  const statusLabel = useStatusLabel();
  const currency = useCurrency();
  const { timeZone } = useStore();
  const price = (amount: string) => formatPrice(locale, amount, currency);
  const window_ = order.fulfilment.promisedWindow;
  const tax = taxLine(taxMode, order.tax);

  return (
    <div className="container-sf grid gap-10 py-8 lg:grid-cols-12 lg:gap-12 lg:py-12">
      <div className="flex flex-col gap-8 lg:col-span-7">
        <header className="flex flex-col items-start gap-3">
          {justPlaced ? <CheckCircle2 className="size-10 text-positive" aria-hidden="true" /> : null}
          <h1 className="t-title">{justPlaced ? t("orderPlaced") : t("orderTitle")}</h1>
          <p className="text-ink-secondary">
            {t("orderNumber")}:{" "}
            <bdi dir="ltr" className="code font-medium text-ink">
              {formatOrderNumber(order.orderNumber)}
            </bdi>{" "}
            · {formatDate(locale, order.placedAt, timeZone)}
          </p>
        </header>

        <dl className="grid gap-4 border-y border-line py-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="t-label text-ink-muted">{t("orderStatus")}</dt>
            <dd className={cn("font-semibold", STATUS_TONE[order.status])}>{statusLabel(order.status)}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="t-label text-ink-muted">{t("paymentStatus")}</dt>
            <dd className={cn("font-semibold", PAYMENT_TONE[order.payment.status])}>
              {/* COD needs no payment step: its method name says it all. Otherwise the status, then the method. */}
              {order.payment.status === "NOT_REQUIRED" ? (
                paymentMethodName(order.payment.method, t)
              ) : (
                <>
                  {t(`payment_${order.payment.status}`)} · <span className="font-normal text-ink-secondary">{paymentMethodName(order.payment.method, t)}</span>
                </>
              )}
            </dd>
          </div>
          {window_ && order.status !== "CANCELLED" && !isCompletedStatus(order.status) ? (
            <div className="flex flex-col gap-1 sm:col-span-2">
              <dt className="t-label text-ink-muted">{order.fulfilment.mode === "PICKUP" ? t("readyBetween") : t("arrivesBetween")}</dt>
              <dd className="font-medium">
                {formatDate(locale, window_.from, timeZone, DATE_ONLY)} – {formatDate(locale, window_.to, timeZone, DATE_ONLY)}
              </dd>
            </div>
          ) : null}
        </dl>

        <OrderProgress order={order} />

        {justPlaced ? (
          <section className="flex flex-col gap-2">
            <h2 className="t-heading">{t("whatNext")}</h2>
            <p className="text-ink-secondary">{t("whatNextBody")}</p>
          </section>
        ) : null}

        <ShipmentTracking order={order} />

        {order.notes ? (
          <section className="flex flex-col gap-1.5">
            <h2 className="t-heading">{td("yourNote")}</h2>
            {/* The customer's own words, plain text: never markup, and direction follows what they wrote. */}
            <p dir="auto" className="whitespace-pre-line text-ink-secondary">
              {order.notes}
            </p>
          </section>
        ) : null}

        {order.invoiceNumber ? (
          <Link href={`/orders/${order.orderNumber}/invoice${token ? `?t=${encodeURIComponent(token)}` : ""}`} className="btn btn-secondary self-start">
            <FileText className="size-4" aria-hidden="true" />
            {td("viewInvoice")}
          </Link>
        ) : null}

        {token ? <TrackingLink /> : null}

        <PaymentPanel order={order} token={token} />

        {order.timeline?.length ? (
          <section className="flex flex-col gap-3">
            <h2 className="t-heading">{t("timeline")}</h2>
            <ol className="flex flex-col gap-3 border-s border-line-strong ps-5">
              {order.timeline.map((event, index) => (
                <li key={`${event.type}-${index}`} className="relative">
                  <span className="absolute -start-[1.6rem] top-1.5 size-2.5 rounded-full bg-ink" aria-hidden="true" />
                  <p className="font-medium">{timelineLabel(event.type, t, td)}</p>
                  <p className="text-[0.875rem] text-ink-muted">{formatDate(locale, event.at, timeZone, { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <CancelPanel order={order} token={token} />
      </div>

      <aside className="lg:col-span-5">
        <div className="flex flex-col gap-5 bg-surface-muted p-5 lg:sticky lg:top-[calc(72px+1.5rem)] lg:p-6">
          <h2 className="t-heading">{t("orderSummary")}</h2>
          <ul className="flex flex-col gap-3">
            {order.lines.map((line) => (
              <li key={line.lineNumber} className="flex items-start justify-between gap-3 text-[0.9375rem]">
                <span className="min-w-0">
                  <span className="font-medium">{line.productName}</span>
                  {line.variantDescription ? <span className="block text-[0.8125rem] text-ink-secondary">{line.variantDescription}</span> : null}
                  <span className="block text-[0.8125rem] text-ink-muted">
                    {formatNumber(locale, line.quantity)} × {price(line.unitPrice)}
                  </span>
                </span>
                <span className="tabular flex-none">{price(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-2 border-t border-line pt-4 text-[0.9375rem]">
            <Row label={t("subtotal")} value={price(order.subtotal)} />
            {order.discount !== "0" ? <Row label={t("discount")} value={`−${price(order.discount)}`} /> : null}
            <Row label={t("delivery")} value={order.fulfilment.fee === "0" ? t("free") : price(order.fulfilment.fee)} />
            <TaxAddedRow line={tax} price={price} />
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="font-semibold">{t("total")}</dt>
              <dd className="t-price">{price(order.total)}</dd>
            </div>
          </dl>
          <TaxIncludesNote line={tax} price={price} className="-mt-3" />
          <div className="flex items-start gap-3 border-t border-line pt-4 text-[0.9375rem]">
            <MapPin className="mt-0.5 size-4 flex-none text-support" aria-hidden="true" />
            {order.fulfilment.mode === "PICKUP" && order.fulfilment.pickupLocationSnapshot ? (
              <p>
                <span className="font-medium">{order.fulfilment.pickupLocationSnapshot.name}</span>
                <span className="block text-ink-secondary">{order.fulfilment.pickupLocationSnapshot.address}</span>
                {order.fulfilment.pickupLocationSnapshot.phone ? (
                  <a href={`tel:${order.fulfilment.pickupLocationSnapshot.phone.replace(/\s+/g, "")}`} className="inline-flex min-h-11 items-center text-ink-secondary underline-offset-4 hover:text-ink hover:underline">
                    <span className="sr-only">{t("phone")}: </span>
                    <bdi dir="ltr" className="code">
                      {formatPhone(order.fulfilment.pickupLocationSnapshot.phone)}
                    </bdi>
                  </a>
                ) : null}
              </p>
            ) : order.fulfilment.addressSnapshot ? (
              <p>
                <span className="font-medium">{order.fulfilment.addressSnapshot.recipientName}</span>
                <span className="block text-ink-secondary">
                  {[order.fulfilment.addressSnapshot.addressLine1, order.fulfilment.addressSnapshot.addressLine2, order.fulfilment.addressSnapshot.city, order.fulfilment.addressSnapshot.governorate].filter(Boolean).join(locale === "ar" ? "، " : ", ")}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}

/** A guest's way back to this order — no email is sent (D-8), so the link is the receipt. */
function TrackingLink() {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);
  return (
    <section className="flex flex-col gap-3 border border-line-strong bg-surface p-4">
      <h2 className="font-semibold">{t("saveTrackingLink")}</h2>
      <p className="text-[0.9375rem] text-ink-secondary">{t("saveTrackingLinkBody")}</p>
      <button
        type="button"
        className="btn btn-secondary self-start"
        onClick={async () => {
          const url = new URL(window.location.href);
          url.searchParams.delete("placed");
          try {
            await navigator.clipboard.writeText(url.toString());
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard blocked — the address bar still holds the link */
          }
        }}
      >
        <Copy className="size-4" aria-hidden="true" />
        <span aria-live="polite">{copied ? t("linkCopied") : t("copyTrackingLink")}</span>
      </button>
    </section>
  );
}

/** Transfer methods: pay the snapshotted destination the exact amount, then upload the receipt; a rejection reopens it with the reason. */
function PaymentPanel({ order, token }: { order: OrderDetail; token?: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const currency = useCurrency();
  const upload = useUploadProof(order.orderNumber, token);
  const input = useRef<HTMLInputElement>(null);
  const { status, destination, instructions, rejectionReason } = order.payment;
  const needsProof = status === "AWAITING_PAYMENT" || status === "REJECTED";

  if (status === "SUBMITTED") {
    return (
      <section className="flex flex-col gap-2 border border-line-strong bg-surface p-4" role="status">
        <h2 className="font-semibold">{t("proofReceived")}</h2>
        <p className="text-[0.9375rem] text-ink-secondary">{t("proofReceivedBody")}</p>
      </section>
    );
  }
  if (!needsProof || !destination) return null;

  const uploadError = upload.isError ? fieldErrors(upload.error).proof ?? apiMessage(upload.error) ?? t("uploadFailed") : null;
  return (
    <section className="flex flex-col gap-4 border border-line-strong bg-surface p-4 lg:p-5">
      <h2 className="t-heading">{status === "REJECTED" ? t("proofRejectedTitle") : t("completePayment")}</h2>
      {status === "REJECTED" && rejectionReason ? (
        <p className="flex items-start gap-1.5 text-[0.9375rem] font-medium text-critical" role="alert">
          <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
          {t("proofRejectedReason", { reason: rejectionReason })}
        </p>
      ) : null}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[0.9375rem]">
        <dt className="text-ink-secondary">{t("amountToPay")}</dt>
        <dd className="t-price">{formatPrice(locale, order.total, currency)}</dd>
        {destination.accountName ? (
          <>
            <dt className="text-ink-secondary">{t("payTo")}</dt>
            <dd className="font-medium">{destination.accountName}</dd>
          </>
        ) : null}
        {destination.number || destination.handle ? (
          <>
            <dt className="text-ink-secondary">{t("payToNumber")}</dt>
            <dd>
              <bdi dir="ltr" className="code text-[0.9375rem] font-medium">
                {destination.number ?? destination.handle}
              </bdi>
            </dd>
          </>
        ) : null}
      </dl>
      {instructions ? <p className="text-[0.9375rem] text-ink-secondary">{localized(instructions, locale)}</p> : null}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="sr-only"
        aria-label={t("uploadReceipt")}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          // A fresh key per chosen file; the backend also keys proof idempotency on the file's own hash.
          upload.mutate({ file, key: newIdempotencyKey() });
          event.target.value = "";
        }}
      />
      <button type="button" className="btn btn-primary self-start" disabled={upload.isPending} onClick={() => input.current?.click()}>
        <Upload className="size-4" aria-hidden="true" />
        {upload.isPending ? t("uploading") : status === "REJECTED" ? t("uploadNewReceipt") : t("uploadReceipt")}
      </button>
      <p className="text-[0.8125rem] text-ink-muted">{t("receiptRules")}</p>
      {uploadError ? (
        <p className="flex items-start gap-1.5 text-[0.875rem] font-medium text-critical" role="alert">
          <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
          {uploadError}
        </p>
      ) : null}
    </section>
  );
}

/** Cancellation within the configured window (MDS §14) — offered only when the server says it is possible, and confirmed. */
function CancelPanel({ order, token }: { order: OrderDetail; token?: string }) {
  const t = useTranslations("common");
  const cancel = useCancelOrder(order.orderNumber, token);
  const [confirming, setConfirming] = useState(false);
  if (!order.canCancel) return null;
  return (
    <section className="flex flex-col items-start gap-3 border-t border-line pt-6">
      {confirming ? (
        <>
          <p className="font-medium">{t("cancelConfirm")}</p>
          <div className="flex gap-3">
            <button type="button" className="btn btn-secondary border-critical text-critical" disabled={cancel.isPending} onClick={() => cancel.mutate(undefined)}>
              {t("cancelYes")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)}>
              {t("cancelNo")}
            </button>
          </div>
          {cancel.isError ? (
            <p className="text-[0.875rem] font-medium text-critical" role="alert">
              {apiMessage(cancel.error) ?? t("cancelFailed")}
            </p>
          ) : null}
        </>
      ) : (
        <button type="button" className="inline-flex min-h-11 items-center text-[0.9375rem] font-medium text-ink-secondary underline underline-offset-4 hover:text-ink" onClick={() => setConfirming(true)}>
          {t("cancelOrder")}
        </button>
      )}
    </section>
  );
}

type Common = ReturnType<typeof useTranslations<"common">>;
type Docs = ReturnType<typeof useTranslations<"common.orderDocs">>;

/** Event names come from the backend vocabulary; a name this app has no words for is shown as-is rather than hidden. */
function timelineLabel(type: string, t: Common, td: Docs): string {
  const docsKey = `timeline_${type}` as Parameters<Docs>[0];
  if (td.has(docsKey)) return td(docsKey);
  const key = `timeline_${type}` as Parameters<Common>[0];
  return t.has(key) ? t(key) : type;
}

/**
 * Where the order is on its journey: placed → … → delivered, or → ready → collected for a pickup. A cancelled order
 * draws nothing (it is off the journey). Order status stays a separate signal from payment, above — this is the
 * fulfilment axis only. Text carries every state; colour and the marker never do alone.
 */
function OrderProgress({ order }: { order: OrderDetail }) {
  const td = useTranslations("common.orderDocs");
  const statusLabel = useStatusLabel();
  const steps = progressSteps(order.status, order.fulfilment.mode);
  if (steps.length === 0) return null;
  return (
    <ol aria-label={td("progressLabel")} className="grid gap-3 sm:grid-flow-col sm:auto-cols-fr sm:gap-2">
      {steps.map((step) => (
        <li key={step.status} aria-current={step.state === "current" ? "step" : undefined} className="flex items-center gap-3 sm:flex-col sm:items-stretch sm:gap-2">
          <span aria-hidden="true" className={cn("h-1 w-6 flex-none sm:w-auto", step.state === "upcoming" ? "bg-line" : "bg-ink")} />
          <span className={cn("text-[0.875rem] leading-snug", step.state === "current" ? "font-semibold text-ink" : step.state === "done" ? "text-ink-secondary" : "text-ink-muted")}>
            {statusLabel(step.status)}
            <span className="sr-only"> — {td(step.state === "current" ? "stepCurrent" : step.state === "done" ? "stepDone" : "stepUpcoming")}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Carrier and tracking number, as staff entered them. The link is the one frozen with the order, and only an https one is ever a link. */
function ShipmentTracking({ order }: { order: OrderDetail }) {
  const td = useTranslations("common.orderDocs");
  const tracking = order.tracking;
  if (!tracking) return null;
  const linkable = tracking.url.startsWith("https://");
  return (
    <section className="flex flex-col gap-2 border border-line-strong bg-surface p-4">
      <h2 className="font-semibold">{td("trackingTitle")}</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[0.9375rem]">
        <dt className="text-ink-secondary">{td("trackingCarrier")}</dt>
        <dd dir="auto" className="font-medium">
          {tracking.carrierName}
        </dd>
        <dt className="text-ink-secondary">{td("trackingNumber")}</dt>
        <dd>
          <bdi dir="ltr" className="code font-medium">
            {formatTracking(tracking.trackingNumber)}
          </bdi>
        </dd>
      </dl>
      {linkable ? (
        <a href={tracking.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary self-start">
          <ExternalLink className="size-4" aria-hidden="true" />
          {td("trackShipment")}
          <span className="sr-only"> {td("opensNewTab")}</span>
        </a>
      ) : null}
    </section>
  );
}
