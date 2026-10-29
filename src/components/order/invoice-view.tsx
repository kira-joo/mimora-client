"use client";

import { Printer } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Link } from "@/i18n/navigation";
import { useCurrency, useStore } from "@/components/providers/store-context";
import { apiStatus } from "@/lib/api/errors";
import type { Invoice } from "@/lib/api/types";
import { paymentMethodName } from "@/lib/catalog/assurances";
import { formatDate, formatNumber, formatOrderNumber, formatPercent, formatPhone, formatPrice, formatSku, localized } from "@/lib/format/numerals";
import { useInvoice } from "@/lib/order/use-order";
import type { Locale } from "@/i18n/routing";
import "./invoice-print.css";

const HEADING = "t-label text-ink-muted mb-1";

/**
 * The customer's invoice — their own, by session or by the guest's access token, otherwise the same "not found" as an
 * order that does not exist. Built by the backend from the order's own snapshots, so it reads the same months later.
 *
 * It is a paper document: on screen a sheet with a Print button, on paper the sheet alone (A4, `invoice-print.css`).
 * Ink on white in both grounds on purpose — an invoice that prints dark because the site was in dark mode is useless.
 * Numerals follow the locale (D-10: Arabic-Indic in `ar`), except identifiers people copy and file — the invoice and
 * order numbers, SKUs and phone numbers stay Western and are isolated so RTL never reorders them.
 */
export function InvoiceView({ orderNumber, token }: { orderNumber: string; token?: string }) {
  const t = useTranslations("common.orderDocs");
  const common = useTranslations("common");
  const invoice = useInvoice(orderNumber, token);
  const back = token ? `/orders/${orderNumber}?t=${encodeURIComponent(token)}` : `/account/orders/${orderNumber}`;

  if (invoice.isLoading) return <div className="container-sf my-10 h-[60vh] animate-pulse bg-surface-muted motion-reduce:animate-none" aria-busy="true" aria-label={t("invoiceLoading")} />;
  if (invoice.isError || !invoice.data) {
    const status = apiStatus(invoice.error);
    const notFound = status === 404 || status === 401;
    return (
      <div className="container-sf flex max-w-2xl flex-col items-start gap-4 py-20">
        <h1 className="t-title">{notFound ? t("invoiceNotFoundTitle") : common("orderUnavailableTitle")}</h1>
        <p className="text-ink-secondary">{notFound ? t("invoiceNotFoundBody") : t("invoiceUnavailable")}</p>
        <Link href={back} className="btn btn-secondary">
          {t("backToOrder")}
        </Link>
      </div>
    );
  }
  return (
    <div className="invoice-canvas container-sf py-6 print:p-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={back} className="inline-flex min-h-11 items-center text-[0.9375rem] font-medium text-ink-secondary underline underline-offset-4 hover:text-ink">
          {t("backToOrder")}
        </Link>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden="true" />
          {t("printInvoice")}
        </button>
      </div>
      <InvoiceSheet invoice={invoice.data} />
    </div>
  );
}

export function InvoiceSheet({ invoice }: { invoice: Invoice }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common.orderDocs");
  const common = useTranslations("common");
  const currency = useCurrency();
  const { timeZone } = useStore();
  const price = (amount: string) => formatPrice(locale, amount, currency);
  const day = (iso: string) => formatDate(locale, iso, timeZone);
  const voided = invoice.status === "VOID";
  const rate = formatPercent(locale, invoice.tax.rate);
  const hasValue = (amount: string) => Number(amount) > 0;
  const address = invoice.fulfilment.address;
  const pickup = invoice.fulfilment.pickupLocation;
  const sellerName = invoice.seller ? localized(invoice.seller.name, locale) : "";

  return (
    // Paper: ink on white whatever the ground (see the component comment).
    <article className="invoice-sheet mx-auto flex max-w-[210mm] flex-col gap-6 border border-black/20 bg-white p-6 text-black sm:p-[14mm] print:max-w-none print:border-0 print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-semibold leading-tight">{t("invoice")}</h1>
          <p className="mt-1 text-[0.9375rem]">
            {t("invoiceNumber")}:{" "}
            <bdi dir="ltr" className="code font-semibold">
              {invoice.invoiceNumber}
            </bdi>
          </p>
        </div>
        {voided ? (
          <div className="text-end" role="status">
            <span className="inline-block -rotate-6 border-[3px] border-critical px-3 py-1 text-[1.25rem] font-semibold tracking-[0.2em] text-critical">{t("invoiceVoid")}</span>
            <p className="mt-2 text-[0.875rem]">{invoice.voidedAt ? t("invoiceVoidNote", { date: day(invoice.voidedAt) }) : t("invoiceVoidNoDate")}</p>
          </div>
        ) : null}
      </header>

      <section className="grid gap-5 sm:grid-cols-2">
        <div>
          <h2 className={HEADING}>{t("invoiceFrom")}</h2>
          {invoice.seller ? (
            <p className="text-[0.9375rem]">
              <span dir="auto" className="font-semibold">
                {sellerName}
              </span>
              {invoice.seller.phone ? (
                <>
                  <br />
                  <bdi dir="ltr" className="code">
                    {formatPhone(invoice.seller.phone)}
                  </bdi>
                </>
              ) : null}
              {invoice.seller.email ? (
                <>
                  <br />
                  <bdi dir="ltr">{invoice.seller.email}</bdi>
                </>
              ) : null}
            </p>
          ) : (
            <p>—</p>
          )}
        </div>
        <div>
          <h2 className={HEADING}>{t("invoiceBillTo")}</h2>
          <p className="text-[0.9375rem]">
            <span dir="auto" className="font-semibold">
              {invoice.billTo.name ?? "—"}
            </span>
            {invoice.billTo.phone ? (
              <>
                <br />
                <bdi dir="ltr" className="code">
                  {formatPhone(invoice.billTo.phone)}
                </bdi>
              </>
            ) : null}
            {invoice.billTo.email ? (
              <>
                <br />
                <bdi dir="ltr">{invoice.billTo.email}</bdi>
              </>
            ) : null}
          </p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[0.9375rem]">
          <dt className="text-black/70">{common("orderNumber")}</dt>
          <dd>
            <bdi dir="ltr" className="code">
              {formatOrderNumber(invoice.orderNumber)}
            </bdi>
          </dd>
          <dt className="text-black/70">{t("invoiceDate")}</dt>
          <dd>{day(invoice.issuedAt)}</dd>
          <dt className="text-black/70">{t("orderDate")}</dt>
          <dd>{day(invoice.placedAt)}</dd>
        </dl>
        <div>
          <h2 className={HEADING}>{invoice.fulfilment.mode === "PICKUP" ? t("invoiceCollectedFrom") : t("invoiceDeliveredTo")}</h2>
          <p dir="auto" className="text-[0.9375rem]">
            {pickup ? (
              <>
                <span className="font-semibold">{pickup.name}</span>
                <br />
                {pickup.address}
              </>
            ) : address ? (
              <>
                <span className="font-semibold">{address.recipientName}</span>
                <br />
                {[address.addressLine1, address.addressLine2, address.city, address.governorate].filter(Boolean).join(locale === "ar" ? "، " : ", ")}
              </>
            ) : (
              "—"
            )}
          </p>
        </div>
      </section>

      {/* A wide table scrolls inside its own box on a phone; the page never does, and on paper it fits the sheet. */}
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[34rem] border-collapse text-[0.9375rem] print:min-w-0">
          <thead>
            <tr className="border-b-2 border-black text-start">
              <th scope="col" className="py-2 pe-3 text-start font-semibold">
                {t("invoiceItem")}
              </th>
              <th scope="col" className="py-2 pe-3 text-start font-semibold">
                {t("invoiceSku")}
              </th>
              <th scope="col" className="py-2 pe-3 text-end font-semibold">
                {t("invoiceQty")}
              </th>
              <th scope="col" className="py-2 pe-3 text-end font-semibold">
                {t("invoiceUnitPrice")}
              </th>
              <th scope="col" className="py-2 pe-3 text-end font-semibold">
                {t("invoiceDiscount")}
              </th>
              <th scope="col" className="py-2 text-end font-semibold">
                {t("invoiceAmount")}
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.lineNumber} className="border-b border-black/15 align-top">
                <td className="py-2 pe-3">
                  <span className="font-medium">{line.productName}</span>
                  {line.variantDescription ? <span className="block text-[0.8125rem] text-black/70">{line.variantDescription}</span> : null}
                </td>
                <td className="py-2 pe-3">
                  <bdi dir="ltr" className="code whitespace-nowrap">
                    {formatSku(line.sku)}
                  </bdi>
                </td>
                <td className="tabular py-2 pe-3 text-end">{formatNumber(locale, line.quantity)}</td>
                <td className="tabular py-2 pe-3 text-end">{price(line.unitPrice)}</td>
                <td className="tabular py-2 pe-3 text-end">{hasValue(line.discount) ? `−${price(line.discount)}` : "—"}</td>
                <td className="tabular py-2 text-end">{price(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ms-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-[0.9375rem]">
        <dt>{common("subtotal")}</dt>
        <dd className="tabular text-end">{price(invoice.subtotal)}</dd>
        {hasValue(invoice.discount) ? (
          <>
            <dt>
              {common("discount")}
              {invoice.promotionCode ? (
                <>
                  {" "}
                  (<bdi dir="ltr" className="code">{invoice.promotionCode}</bdi>)
                </>
              ) : null}
            </dt>
            <dd className="tabular text-end">−{price(invoice.discount)}</dd>
          </>
        ) : null}
        <dt>{common("delivery")}</dt>
        <dd className="tabular text-end">{hasValue(invoice.shipping) ? price(invoice.shipping) : common("free")}</dd>
        {/* Tax by the mode in force when the order was placed: on top of the subtotal, or already inside the total. */}
        {invoice.tax.mode === "ADDED" ? (
          <>
            <dt>{t("invoiceTaxAdded", { rate })}</dt>
            <dd className="tabular text-end">{price(invoice.tax.amount)}</dd>
          </>
        ) : null}
        <dt className="border-t-2 border-black pt-2 font-semibold">{common("total")}</dt>
        <dd className="tabular border-t-2 border-black pt-2 text-end text-[1.125rem] font-semibold">{price(invoice.total)}</dd>
        {invoice.tax.mode === "INCLUDED" ? <dd className="col-span-2 text-[0.8125rem] text-black/70">{t("invoiceTaxIncluded", { rate, amount: price(invoice.tax.amount) })}</dd> : null}
      </dl>

      <section>
        <h2 className={HEADING}>{t("invoicePayment")}</h2>
        <p className="text-[0.9375rem]">
          {/* COD needs no payment step: its method name says it all (as on the order page). Otherwise the method, then where the payment stands. */}
          {invoice.payment.status === "NOT_REQUIRED" ? paymentMethodName(invoice.payment.method, common) : `${paymentMethodName(invoice.payment.method, common)} · ${common(`payment_${invoice.payment.status}`)}`}
        </p>
      </section>

      {invoice.refunds.entries.length > 0 ? (
        <section>
          <h2 className={HEADING}>{t("invoiceRefunds")}</h2>
          <table className="w-full border-collapse text-[0.9375rem]">
            <tbody>
              {invoice.refunds.entries.map((entry, index) => (
                <tr key={index} className="border-b border-black/15">
                  <td className="py-1.5 pe-3">{entry.kind === "RETURN" ? t("invoiceRefundReturn", { number: entry.returnNumber ?? "" }) : t("invoiceRefundPayment")}</td>
                  <td className="py-1.5 pe-3">{entry.at ? day(entry.at) : ""}</td>
                  <td className={cn("py-1.5 pe-3", entry.reference && "code")}>{entry.reference ? <bdi dir="ltr">{entry.reference}</bdi> : null}</td>
                  <td className="tabular py-1.5 text-end">−{price(entry.amount)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} className="py-1.5 pe-3 font-semibold">
                  {t("invoiceRefundTotal")}
                </td>
                <td className="tabular py-1.5 text-end font-semibold">−{price(invoice.refunds.total)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}
    </article>
  );
}
