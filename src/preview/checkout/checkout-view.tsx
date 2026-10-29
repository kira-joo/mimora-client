"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, ChevronDown, CircleAlert, MapPin } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { formatNumber, formatOrderNumber, formatPrice, t } from "../format";
import { getDictionary } from "../i18n";
import { optionLabels } from "../lib/option-labels";
import { quote, type Quote } from "../mock-api/quote";
import { store } from "../fixtures/catalog";
import { usePreviewState } from "../state";
import type { Locale } from "../types";
import { Sheet } from "../components/sheet";

type Fulfilment = "delivery" | "pickup";
type Method = (typeof store.paymentMethods)[number]["method"];
type Errors = Partial<Record<"phone" | "name" | "governorate" | "city" | "street" | "terms", string>>;

/**
 * Checkout (MDS §6.6, design §13b): one page in the fixed sections — contact →
 * fulfilment → address or pickup → payment → review. Phone first (D-9), guest
 * by default. Errors land on their field, the first one is focused, and the
 * count is announced. The terms acceptance (D-13) is an unticked checkbox
 * naming Terms of Sale and Returns; each opens in a sheet over checkout.
 * Every figure is the (mock) server quote — this view does no arithmetic.
 */
export function CheckoutView({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const reduce = useReducedMotion();
  const { lines, clearCart } = usePreviewState();
  const [fulfilment, setFulfilment] = useState<Fulfilment>("delivery");
  const [method, setMethod] = useState<Method>("COD");
  const [errors, setErrors] = useState<Errors>({});
  const [termsOpen, setTermsOpen] = useState<"terms" | "returns" | null>(null);
  const [placed, setPlaced] = useState<{ orderNumber: string; total: string } | null>(null);
  const [placing, setPlacing] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const summary = quote(lines, fulfilment);

  if (placed) return <Confirmation locale={locale} orderNumber={placed.orderNumber} total={placed.total} method={method} />;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const next: Errors = {};
    if (!value("phone")) next.phone = dict.required;
    else if (!/^01[0125]\d{8}$/.test(value("phone").replace(/\s/g, ""))) next.phone = dict.phoneInvalid;
    if (!value("name")) next.name = dict.required;
    if (fulfilment === "delivery") {
      if (!value("governorate")) next.governorate = dict.required;
      if (!value("city")) next.city = dict.required;
      if (!value("street")) next.street = dict.required;
    }
    if (data.get("terms") !== "on") next.terms = dict.termsRequired;
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setPlacing(true);
    // Stands in for POST /api/shop/orders with an Idempotency-Key and the accepted terms version.
    window.setTimeout(() => {
      setPlaced({ orderNumber: "ORD-000124", total: summary.total });
      clearCart();
      window.scrollTo({ top: 0 });
    }, 700);
  }

  const errorCount = Object.keys(errors).length;

  return (
    <div className="container-sf pt-4 pb-10 lg:pt-10">
      <h1 className="t-title mb-3">{dict.checkout}</h1>
      <div className="rule mb-6" aria-hidden="true" />

      <MobileSummary locale={locale} summary={summary} />

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <form ref={form} noValidate onSubmit={submit} className="flex flex-col gap-10 lg:col-span-7">
          {errorCount > 0 ? (
            <p role="alert" className="flex items-center gap-2 border border-critical px-4 py-3 text-[0.9375rem] font-medium text-critical">
              <CircleAlert className="size-4 flex-none" aria-hidden="true" />
              {dict.fixErrors(formatNumber(locale, errorCount))}
            </p>
          ) : null}

          <Section step={1} title={dict.contact} locale={locale}>
            <Field name="phone" label={dict.phone} error={errors.phone} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="01012345678" />
            <Field name="name" label={dict.fullName} error={errors.name} autoComplete="name" />
            <Field name="email" label={dict.emailOptional} type="email" autoComplete="email" dir="ltr" />
            <p className="text-[0.875rem] text-ink-muted">{dict.guestNote}</p>
          </Section>

          <Section step={2} title={dict.fulfilment} locale={locale}>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={dict.fulfilment}>
              <Choice name="fulfilment" checked={fulfilment === "delivery"} onChange={() => setFulfilment("delivery")} title={dict.deliverToMe} meta={formatPrice(locale, store.deliveryFee)} detail={dict.deliveryLine(formatNumber(locale, store.deliveryDays.min), formatNumber(locale, store.deliveryDays.max))} />
              <Choice name="fulfilment" checked={fulfilment === "pickup"} onChange={() => setFulfilment("pickup")} title={dict.pickUp} meta={dict.free} detail={t(store.pickupLocation.name, locale)} />
            </div>
          </Section>

          <Section step={3} title={fulfilment === "delivery" ? dict.address : dict.pickupFrom} locale={locale}>
            {fulfilment === "delivery" ? (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[0.9375rem] font-medium">{dict.governorate}</span>
                  <select name="governorate" defaultValue="" className="field" aria-invalid={!!errors.governorate || undefined} aria-describedby={errors.governorate ? "governorate-error" : undefined} autoComplete="address-level1">
                    <option value="" disabled>
                      —
                    </option>
                    {store.governorates.map((governorate) => (
                      <option key={governorate.en} value={governorate.en}>
                        {t(governorate, locale)}
                      </option>
                    ))}
                  </select>
                  {errors.governorate ? <FieldError id="governorate-error">{errors.governorate}</FieldError> : null}
                </label>
                <Field name="city" label={dict.city} error={errors.city} autoComplete="address-level2" />
                <Field name="street" label={dict.street} error={errors.street} autoComplete="address-line1" />
                <Field name="apartment" label={dict.apartment} autoComplete="address-line2" />
              </>
            ) : (
              <div className="flex items-start gap-3 border border-line-strong bg-surface p-4">
                <MapPin className="mt-0.5 size-5 flex-none text-support" aria-hidden="true" />
                <div>
                  <p className="font-medium">{t(store.pickupLocation.name, locale)}</p>
                  <p className="text-[0.9375rem] text-ink-secondary">{t(store.pickupLocation.address, locale)}</p>
                </div>
              </div>
            )}
          </Section>

          <Section step={4} title={dict.payment} locale={locale}>
            <div className="flex flex-col gap-3" role="radiogroup" aria-label={dict.payment}>
              {store.paymentMethods.map((option) => (
                <Choice key={option.method} name="payment" checked={method === option.method} onChange={() => setMethod(option.method)} title={t(option.label, locale)}>
                  <AnimatePresence initial={false}>
                    {method === option.method ? (
                      <motion.p
                        initial={reduce ? false : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={reduce ? undefined : { opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
                        className="overflow-hidden text-[0.875rem] text-ink-secondary"
                      >
                        {t(option.instructions, locale)}
                        {option.method !== "COD" ? <span className="mt-1 block">{dict.uploadLater}</span> : null}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                </Choice>
              ))}
            </div>
          </Section>

          <Section step={5} title={dict.review} locale={locale}>
            <label className={cn("flex items-start gap-3 border p-4", errors.terms ? "border-critical" : "border-line-strong")}>
              <input type="checkbox" name="terms" className="mt-1 size-5 flex-none accent-[var(--sf-action)]" aria-invalid={!!errors.terms || undefined} aria-describedby={errors.terms ? "terms-error" : undefined} onChange={() => errors.terms && setErrors(({ terms: _drop, ...rest }) => rest)} />
              <span className="text-[0.9375rem] leading-relaxed">
                {dict.termsLabel}{" "}
                <button type="button" onClick={() => setTermsOpen("terms")} className="font-semibold text-action underline underline-offset-4">
                  {dict.termsOfSale}
                </button>{" "}
                {dict.and}{" "}
                <button type="button" onClick={() => setTermsOpen("returns")} className="font-semibold text-action underline underline-offset-4">
                  {dict.returnsPolicy}
                </button>
              </span>
            </label>
            {errors.terms ? <FieldError id="terms-error">{errors.terms}</FieldError> : null}
            <div className="flex items-center justify-between border-t border-line pt-4">
              <span className="font-semibold">{dict.total}</span>
              <span className="t-price">{formatPrice(locale, summary.total)}</span>
            </div>
            <button type="submit" disabled={placing || summary.lines.length === 0} className="btn btn-primary min-h-[52px] w-full text-base">
              {placing ? dict.placingOrder : dict.placeOrder}
            </button>
          </Section>
        </form>

        <aside className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-[calc(72px+1.5rem)] bg-surface-muted p-6">
            <h2 className="t-heading mb-4">{dict.orderSummary}</h2>
            <SummaryBody locale={locale} summary={summary} />
          </div>
        </aside>
      </div>

      <Sheet open={termsOpen !== null} onClose={() => setTermsOpen(null)} side="bottom" title={termsOpen === "returns" ? dict.returnsTitle : dict.termsTitle} closeLabel={dict.close}>
        <LegalExcerpt locale={locale} which={termsOpen ?? "terms"} />
      </Sheet>
    </div>
  );
}

function Section({ step, title, locale, children }: { step: number; title: string; locale: Locale; children: ReactNode }) {
  const dict = getDictionary(locale);
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <span className="tabular text-[0.8125rem] font-medium text-ink-muted">{dict.step(formatNumber(locale, step))}</span>
        <h2 id={id} className="t-heading">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Field({ name, label, error, ...input }: { name: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.9375rem] font-medium">
        {label}
      </label>
      <input id={id} name={name} className={cn("field", error && "border-critical")} aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-error` : undefined} {...input} />
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-[0.875rem] font-medium text-critical">
      <CircleAlert className="size-4 flex-none" aria-hidden="true" />
      {children}
    </p>
  );
}

function Choice({ name, checked, onChange, title, meta, detail, children }: { name: string; checked: boolean; onChange(): void; title: string; meta?: string; detail?: string; children?: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 border bg-surface p-4 transition-[border-color,box-shadow] duration-[var(--sf-duration-fast)]", checked ? "border-ink shadow-[inset_0_0_0_1px_var(--sf-ink)]" : "border-line-strong")}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 size-5 flex-none accent-[var(--sf-action)]" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-medium">{title}</span>
          {meta ? <span className="tabular flex-none text-[0.9375rem] font-medium">{meta}</span> : null}
        </span>
        {detail ? <span className="text-[0.875rem] text-ink-secondary">{detail}</span> : null}
        {children}
      </span>
    </label>
  );
}

/** Phone: the summary collapses to one line showing the server's total, expandable (§13b). */
function MobileSummary({ locale, summary }: { locale: Locale; summary: Quote }) {
  const dict = getDictionary(locale);
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-8 border-y border-line lg:hidden">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex min-h-14 w-full items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-medium">
          {open ? dict.hideSummary : dict.showSummary}
          <ChevronDown className={cn("size-4 transition-transform duration-[var(--sf-duration-standard)]", open && "rotate-180")} aria-hidden="true" />
        </span>
        <span className="t-price text-[1.125rem]">{formatPrice(locale, summary.total)}</span>
      </button>
      {open ? (
        <div className="pb-5">
          <SummaryBody locale={locale} summary={summary} />
        </div>
      ) : null}
    </div>
  );
}

function SummaryBody({ locale, summary }: { locale: Locale; summary: Quote }) {
  const dict = getDictionary(locale);
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {summary.lines.map((line) => (
          <li key={line.line.lineId} className="flex items-center gap-3">
            <div className="media relative w-14 flex-none" style={{ aspectRatio: "4 / 5" }}>
              {line.product.images[0] ? <Image src={line.product.images[0].src} alt="" fill sizes="56px" className="object-cover" /> : null}
              <span className="tabular absolute -end-1.5 -top-1.5 z-10 min-w-5 rounded-full bg-ink px-1 text-center text-[0.6875rem] font-semibold leading-5 text-canvas">{formatNumber(locale, line.line.quantity)}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[0.9375rem] font-medium">{t(line.product.name, locale)}</span>
              <span className="text-[0.8125rem] text-ink-secondary">{optionLabels(line.product, line.variant, locale)}</span>
            </div>
            <span className="tabular flex-none text-[0.9375rem]">{formatPrice(locale, line.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <dl className="flex flex-col gap-2 border-t border-line pt-4 text-[0.9375rem]">
        <div className="flex justify-between">
          <dt className="text-ink-secondary">{dict.subtotal}</dt>
          <dd className="tabular">{formatPrice(locale, summary.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-secondary">{dict.delivery}</dt>
          <dd className="tabular">{summary.delivery === "0.00" ? dict.free : summary.delivery ? formatPrice(locale, summary.delivery) : "—"}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <dt className="font-semibold">
            {dict.total} <span className="text-[0.8125rem] font-normal text-ink-muted">{dict.taxIncluded}</span>
          </dt>
          <dd className="t-price">{formatPrice(locale, summary.total)}</dd>
        </div>
      </dl>
    </div>
  );
}

function Confirmation({ locale, orderNumber, total, method }: { locale: Locale; orderNumber: string; total: string; method: Method }) {
  const dict = getDictionary(locale);
  const option = store.paymentMethods.find((candidate) => candidate.method === method);
  return (
    <div className="container-sf flex max-w-2xl flex-col items-start gap-5 py-14 lg:py-20">
      <CheckCircle2 className="size-10 text-positive" aria-hidden="true" />
      <h1 className="t-title">{dict.orderPlaced}</h1>
      <dl className="grid w-full grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-line py-4">
        <dt className="text-ink-secondary">{dict.orderNumber}</dt>
        <dd>
          <bdi dir="ltr" className="code text-[0.9375rem] font-medium">
            {formatOrderNumber(orderNumber)}
          </bdi>
        </dd>
        <dt className="text-ink-secondary">{dict.total}</dt>
        <dd className="t-price text-[1.125rem]">{formatPrice(locale, total)}</dd>
        <dt className="text-ink-secondary">{dict.paymentInstructions}</dt>
        <dd>{t(option?.label, locale)}</dd>
      </dl>
      <section className="flex flex-col gap-2">
        <h2 className="t-heading">{dict.whatNext}</h2>
        <p className="text-ink-secondary">{dict.whatNextBody}</p>
        {method !== "COD" ? <p className="text-ink-secondary">{t(option?.instructions, locale)}</p> : null}
      </section>
      <p className="text-[0.9375rem] text-ink-muted">{dict.guestNote}</p>
      <Link href={`/preview/${locale}`} className="btn btn-secondary">
        {dict.backToShop}
      </Link>
    </div>
  );
}

/** Excerpts of the draft legal text (store-platform/docs/legal-and-consent.md) — in production, the versioned CMS page (D-13). */
function LegalExcerpt({ locale, which }: { locale: Locale; which: "terms" | "returns" }) {
  const text =
    which === "terms"
      ? locale === "ar"
        ? ["تُبرم هذه الشروط بينك وبين حِرفة عند تأكيد طلبك.", "الأسعار المعروضة شاملة الضريبة، ويُحتسب التوصيل عند إتمام الطلب.", "نحتفظ بالحق في إلغاء الطلب إذا نفدت الكمية، ونُبلغك فورًا ونرد أي مبلغ مدفوع.", "الإصدار ٣ — آخر تحديث ١ أكتوبر ٢٠٢٦."]
        : ["These terms form the contract between you and Hirfa when you place your order.", "Prices shown include tax; delivery is calculated at checkout.", "If an item sells out we may cancel it, tell you at once, and refund anything paid.", "Version 3 — last updated 1 October 2026."]
      : locale === "ar"
        ? ["يمكنك إرجاع أي منتج غير مستعمل خلال ١٤ يومًا من الاستلام.", "نرد المبلغ بنفس طريقة الدفع خلال ٧ أيام من استلامنا للمرتجع.", "الإصدار ٢ — آخر تحديث ١ أكتوبر ٢٠٢٦."]
        : ["You can return any unused item within 14 days of receiving it.", "We refund to your original payment method within 7 days of receiving the return.", "Version 2 — last updated 1 October 2026."];
  return (
    <div className="flex max-w-prose flex-col gap-3 text-[0.9375rem] leading-relaxed text-ink-secondary">
      {text.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}
