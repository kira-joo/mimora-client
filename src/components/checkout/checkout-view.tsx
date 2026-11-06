"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, MapPin } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Link, useRouter } from "@/i18n/navigation";
import { StoreHours } from "@/components/chrome/store-hours";
import { Sheet } from "@/components/ui/sheet";
import { useCurrency, useStore } from "@/components/providers/store-context";
import { newIdempotencyKey, sessionApi } from "@/lib/api/session-client";
import { SessionEndpoints } from "@/lib/api/session.endpoints";
import { SessionPrivacyEndpoints } from "@/lib/api/privacy.endpoints";
import { addPaymentInfo, beginCheckout, purchase as purchaseEvent } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { apiDetails, apiMessage, apiStatus, fieldErrors } from "@/lib/api/errors";
import type { DeliveryZone, FulfilmentSettings, PaymentMethodView, PickupLocation } from "@/lib/api/types";
import { useAddresses } from "@/lib/account/use-account";
import { cartKeys, useCart, useQuote, useSetFulfilment } from "@/lib/cart/use-cart";
import { addressToDraft, availableModes, fulfilmentDraft, matchesSaved, missingFields, sortedMethods, type CheckoutDraft, type CheckoutErrors } from "@/lib/checkout/checkout-model";
import { taxModeOf } from "@/lib/checkout/tax-label";
import type { HoursView } from "@/lib/catalog/operating-hours";
import { paymentMethodName } from "@/lib/catalog/assurances";
import { formatDate, formatNumber, formatPhone, formatPrice, localized } from "@/lib/format/numerals";
import { useSession } from "@/lib/session/use-session";
import type { Locale } from "@/i18n/routing";
import { Choice, Field, FieldError, Section } from "./fields";
import { MobileSummary, SummaryBody } from "./order-summary";
import { MOTION } from "@/lib/motion/tokens";

export interface CheckoutConfig {
  settings: FulfilmentSettings | null;
  zones: DeliveryZone[];
  pickupLocations: PickupLocation[];
  paymentMethods: PaymentMethodView[];
  /** The live terms page — its version is what the order records (D-13). Null: the store cannot take orders yet. */
  terms: { version: number; title: string; body: string } | null;
  returns: { title: string; body: string } | null;
  /** Weekly hours and exceptions in the store's zone, resolved on the server; null when the merchant has published none. */
  hours: HoursView | null;
}

/**
 * Checkout (MDS §6.6, §12; design-system §13b): one page in fixed sections —
 * contact → fulfilment → address or pickup → payment → review. Phone first
 * (D-9), guest by default. The fulfilment choice is sent to the cart as soon as
 * it can be quoted, so delivery fees, the promised window and refusals (zone
 * not served, below minimum) appear before placing. Every figure is the
 * server's quote. Server validation errors land on their fields; the first one
 * is focused and the count announced. Placing carries an Idempotency-Key that a
 * retry of the SAME submission reuses — a double tap places one order.
 */
export function CheckoutView({ config, mayHaveCart = true }: { config: CheckoutConfig; mayHaveCart?: boolean }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const tp = useTranslations("common.privacy");
  const tn = useTranslations("common.newsletter");
  const currency = useCurrency();
  const { timeZone } = useStore();
  const reduce = useReducedMotion();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: customer, isLoading: sessionLoading } = useSession();
  const cart = useCart();
  const quote = useQuote(true);
  const setFulfilment = useSetFulfilment();
  const form = useRef<HTMLFormElement>(null);
  const idempotencyKey = useRef<string | null>(null);

  const modes = useMemo(() => availableModes(config.settings, config.pickupLocations), [config.settings, config.pickupLocations]);
  const methods = useMemo(() => sortedMethods(config.paymentMethods), [config.paymentMethods]);
  const guest = !customer;

  const [draft, setDraft] = useState<CheckoutDraft>(() => ({
    contact: { name: "", phone: "", email: "" },
    // A single remaining mode is applied silently (MDS §18); a single method likewise (MDS §13).
    mode: modes.length === 1 ? modes[0] : undefined,
    address: { governorate: "", city: "", addressLine1: "", addressLine2: "" },
    pickupLocationId: config.pickupLocations.length === 1 ? config.pickupLocations[0]!._id : undefined,
    paymentMethod: methods.length === 1 ? methods[0]!.method : undefined,
    termsAccepted: false,
  }));
  // Saved addresses (plan #36): a signed-in customer picks one, which prefills the form; the form stays editable, and a guest never sees any of this.
  const savedAddresses = useAddresses().data?.addresses ?? [];
  const savedPicked = savedAddresses.find((candidate) => matchesSaved(draft.address, candidate, config.zones))?._id;
  const prefilledDefault = useRef(false);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [legal, setLegal] = useState<"terms" | "returns" | null>(null);
  // Order notes travel with the order (the backend trims and caps them at ORDER_NOTES_MAX). A changed note is a changed submission.
  const [notes, setNotes] = useState("");
  // The newsletter opt-in is optional, UNTICKED, and acted on only after the order is placed — it can never affect or block the order.
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);

  const update = (next: Partial<CheckoutDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
    idempotencyKey.current = null; // a changed submission is a new submission
    setFailure(null);
  };

  // The customer's default address pre-fills an untouched delivery form — once, so it never overwrites what they then type.
  useEffect(() => {
    if (prefilledDefault.current || draft.mode !== "DELIVERY" || savedAddresses.length === 0) return;
    prefilledDefault.current = true;
    const untouched = !draft.address.governorate && !draft.address.city && !draft.address.addressLine1;
    const preferred = savedAddresses.find((candidate) => candidate.isDefault);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- applies the saved addresses (async query data) to the form once, when they first arrive; the `prefilledDefault` guard bounds it to a single run.
    if (untouched && preferred) update({ address: addressToDraft(preferred, config.zones) });
    // `update` and `draft.address` are read at the moment the addresses first arrive; later keystrokes must not re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberate: adding `draft.address`/`update`/`config.zones` would re-run the prefill on every keystroke.
  }, [draft.mode, savedAddresses.length]);

  // Send the fulfilment choice once it can be quoted; the quote then carries the fee and window.
  const pending = fulfilmentDraft(draft, { name: draft.contact.name || customer?.name || "", phone: draft.contact.phone || customer?.phone || "" });
  const pendingKey = JSON.stringify(pending);
  useEffect(() => {
    if (!pending || !cart.data?.lines.length) return;
    const timer = window.setTimeout(() => {
      setFulfilment.mutate(pending, {
        onError: (error) => {
          const fields = fieldErrors(error);
          setErrors((current) => ({ ...current, governorate: fields["address.governorate"], city: fields["address.city"], addressLine1: fields["address.addressLine1"] }));
        },
      });
    }, 500);
    return () => window.clearTimeout(timer);
    // Keyed on the draft's content, not its identity: re-send only when what would be sent changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberate: `pending` is a fresh object every render and `setFulfilment` a new mutation object, so listing them would re-send the fulfilment on every render; `pendingKey` is `pending`'s content.
  }, [pendingKey, cart.data?.lines.length]);

  const place = useMutation({
    mutationFn: () => {
      idempotencyKey.current ??= newIdempotencyKey();
      const body = {
        paymentMethod: draft.paymentMethod!,
        termsVersionAccepted: config.terms!.version,
        ...(guest ? { guestContact: { name: draft.contact.name.trim(), phone: draft.contact.phone.trim(), ...(draft.contact.email.trim() ? { email: draft.contact.email.trim() } : {}) } } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };
      return sessionApi().request(SessionEndpoints.placeOrder, { body, headers: { "Idempotency-Key": idempotencyKey.current } });
    },
    onSuccess: (order) => {
      // Analytics (consent-gated, no personal data): the order number and the SERVER's confirmed total, verbatim.
      track(purchaseEvent({ orderNumber: order.orderNumber, total: order.total, currency, itemCount: cart.data?.lines.length ?? 0 }));
      void subscribeAfterOrder();
      queryClient.removeQueries({ queryKey: cartKeys.cart });
      queryClient.removeQueries({ queryKey: cartKeys.quote });
      router.push({ pathname: `/orders/${order.orderNumber}`, query: { placed: "1", ...(order.accessToken ? { t: order.accessToken } : {}) } });
    },
    onError: (error) => {
      const fields = fieldErrors(error);
      const mapped: CheckoutErrors = { name: fields["guestContact.name"], phone: fields["guestContact.phone"], email: fields["guestContact.email"], paymentMethod: fields.paymentMethod };
      const details = apiDetails(error);
      if (details?.reason === "TERMS_VERSION_CHANGED" || details?.reason === "TERMS_NOT_PUBLISHED") {
        // The terms changed while checking out: the customer must see and accept the current version.
        update({ termsAccepted: false });
        mapped.terms = t("termsChanged");
        router.refresh();
      }
      const hasFields = Object.values(mapped).some(Boolean);
      setErrors(mapped);
      if (!hasFields) {
        const status = apiStatus(error);
        // Placement refusals are specific (MDS §12): the server names stock and fulfilment problems.
        setFailure(status === 429 ? t("tooManyAttempts") : status === 409 || status === 404 ? apiMessage(error) ?? t("placeFailed") : t("placeFailed"));
        idempotencyKey.current = status && status < 500 ? null : idempotencyKey.current; // a refused order is not retried as-is
      }
    },
  });

  /**
   * After a SUCCESSFUL order only, and never allowed to fail it: signed in, the opt-in is marketing consent on the account
   * (source `checkout`); as a guest it is a newsletter subscription for the email they gave. Errors are swallowed on purpose —
   * the order is placed, and a missed newsletter signup is not something to tell a customer who just paid.
   */
  async function subscribeAfterOrder() {
    if (!newsletterOptIn) return;
    const language = locale === "en" ? "en" : "ar";
    try {
      if (customer) await sessionApi().request(SessionPrivacyEndpoints.marketingConsent, { body: { granted: true, source: "checkout", locale: language } });
      else if (draft.contact.email.trim()) await sessionApi().request(SessionPrivacyEndpoints.newsletter, { body: { email: draft.contact.email.trim(), locale: language, source: "checkout" } });
    } catch {
      /* the order stands */
    }
  }

  // Reaching checkout with a cart is the start of the checkout funnel — once per visit, not per cart edit.
  const trackedBegin = useRef(false);
  const lineCount = cart.data?.lines.length ?? 0;
  useEffect(() => {
    if (trackedBegin.current || lineCount === 0) return;
    trackedBegin.current = true;
    track(beginCheckout(lineCount));
  }, [lineCount]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const missing = missingFields(draft, { guest, zones: config.zones, requireTerms: true });
    const words: CheckoutErrors = {};
    for (const [key, value] of Object.entries(missing)) if (value) words[key as keyof CheckoutErrors] = value === "termsRequired" ? t("termsRequired") : value === "phoneInvalid" ? t("phoneInvalid") : value === "emailInvalid" ? t("emailInvalid") : t("required");
    setErrors(words);
    const first = Object.keys(words)[0];
    if (first) {
      form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    if (!quote.data || quote.data.shippingPending || quote.isFetching || setFulfilment.isPending) {
      setFailure(t("waitForQuote"));
      return;
    }
    place.mutate();
  }

  // ---- states that are designed, not discovered (MDS §15)
  if (!mayHaveCart || (!cart.isLoading && !cart.data?.lines.length)) return <EmptyCheckout />;
  if (cart.isLoading || sessionLoading) return <CheckoutSkeleton />;
  if (modes.length === 0 || methods.length === 0 || !config.terms) {
    // Nothing to fulfil with, nothing to pay with, or no terms to accept: the store says plainly it cannot take orders now.
    return (
      <div className="container-sf flex max-w-2xl flex-col items-start gap-4 py-20">
        <h1 className="t-title">{t("cannotOrderTitle")}</h1>
        <p className="text-ink-secondary">{t("cannotOrderBody")}</p>
        <Link href="/cart" className="btn btn-secondary">
          {t("backToCart")}
        </Link>
      </div>
    );
  }
  if (guest && config.settings && !config.settings.allowGuestCheckout) {
    return (
      <div className="container-sf flex max-w-2xl flex-col items-start gap-4 py-20">
        <h1 className="t-title">{t("signInToCheckout")}</h1>
        <p className="text-ink-secondary">{t("signInToCheckoutBody")}</p>
        <Link href={{ pathname: "/login", query: { redirectTo: "/checkout" } }} className="btn btn-primary">
          {t("signIn")}
        </Link>
      </div>
    );
  }

  const q = quote.data;
  const fulfilmentProblem = quote.isError ? apiMessage(quote.error) ?? t("fulfilmentUnavailable") : null;
  const errorCount = Object.values(errors).filter(Boolean).length;
  // The configured mode, never a guess: settings that did not load show no tax line (and were logged on the server).
  const taxMode = taxModeOf(config.settings);
  const zoneOptions = [...config.zones].sort((a, b) => a.order - b.order);

  return (
    <div className="container-sf pt-4 pb-10 lg:pt-10">
      <h1 className="t-title mb-3">{t("checkout")}</h1>
      <div className="rule mb-6" aria-hidden="true" />
      {q ? <MobileSummary quote={q} taxMode={taxMode} /> : null}

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <form ref={form} noValidate onSubmit={submit} className="flex flex-col gap-10 lg:col-span-7">
          {errorCount > 0 ? (
            <p role="alert" className="flex items-center gap-2 border border-critical px-4 py-3 text-[0.9375rem] font-medium text-critical">
              <CircleAlert className="size-4 flex-none" aria-hidden="true" />
              {t("fixErrors", { n: formatNumber(locale, errorCount) })}
            </p>
          ) : null}

          <Section step={1} title={t("contact")}>
            {guest ? (
              <>
                <Field name="phone" label={t("phone")} error={errors.phone} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={draft.contact.phone} onChange={(event) => update({ contact: { ...draft.contact, phone: event.target.value } })} />
                <Field name="name" label={t("fullName")} error={errors.name} autoComplete="name" value={draft.contact.name} onChange={(event) => update({ contact: { ...draft.contact, name: event.target.value } })} />
                <Field name="email" label={t("emailOptional")} error={errors.email} type="email" autoComplete="email" dir="ltr" value={draft.contact.email} onChange={(event) => update({ contact: { ...draft.contact, email: event.target.value } })} />
                <p className="text-[0.875rem] text-ink-muted">
                  {t("guestNote")}{" "}
                  <Link href={{ pathname: "/login", query: { redirectTo: "/checkout" } }} className="font-medium text-action underline underline-offset-4">
                    {t("signIn")}
                  </Link>
                </p>
              </>
            ) : (
              <p className="border border-line-strong bg-surface p-4 text-[0.9375rem]">
                {t("signedInAs", { name: customer!.name })} · <bdi dir="ltr">{customer!.phone}</bdi>
              </p>
            )}
          </Section>

          {config.hours ? <StoreHours view={config.hours} variant="compact" /> : null}

          {modes.length > 1 ? (
            <Section step={2} title={t("fulfilment")}>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t("fulfilment")}>
                {modes.map((mode) => (
                  <Choice key={mode} name="mode" value={mode} checked={draft.mode === mode} onChange={() => update({ mode })} title={mode === "DELIVERY" ? t("deliverToMe") : t("pickUp")} meta={mode === "PICKUP" ? t("free") : undefined} />
                ))}
              </div>
              {errors.mode ? <FieldError id="mode-error">{errors.mode}</FieldError> : null}
            </Section>
          ) : null}

          {draft.mode ? (
            <Section step={modes.length > 1 ? 3 : 2} title={draft.mode === "DELIVERY" ? t("address") : t("pickupFrom")}>
              {draft.mode === "DELIVERY" ? (
                <>
                  {savedAddresses.length > 0 ? (
                    <div className="flex flex-col gap-3" role="radiogroup" aria-label={t("savedAddresses")}>
                      {savedAddresses.map((saved) => (
                        <Choice
                          key={saved._id}
                          name="savedAddress"
                          value={saved._id}
                          checked={savedPicked === saved._id}
                          onChange={() => update({ address: addressToDraft(saved, config.zones) })}
                          title={saved.label}
                          meta={saved.isDefault ? t("defaultAddress") : undefined}
                          detail={[saved.addressLine1, saved.addressLine2, saved.city, saved.governorate].filter(Boolean).join(locale === "ar" ? "، " : ", ")}
                        />
                      ))}
                      <Choice name="savedAddress" value="new" checked={savedPicked === undefined} onChange={() => update({ address: { governorate: "", city: "", addressLine1: "", addressLine2: "" } })} title={t("useDifferentAddress")} />
                    </div>
                  ) : null}
                  {zoneOptions.length > 0 ? (
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[0.9375rem] font-medium">{t("governorate")}</span>
                      {/* The value is the zone's English name — what the backend's quote matches on. */}
                      <select name="governorate" value={draft.address.governorate} onChange={(event) => update({ address: { ...draft.address, governorate: event.target.value } })} className="field" aria-invalid={errors.governorate ? true : undefined} aria-describedby={errors.governorate ? "governorate-error" : undefined} autoComplete="address-level1">
                        <option value="" disabled>
                          —
                        </option>
                        {zoneOptions.map((zone) => (
                          <option key={zone._id} value={zone.name.en}>
                            {localized(zone.name, locale)} — {zone.fee === "0" ? t("free") : formatPrice(locale, zone.fee, currency)}
                          </option>
                        ))}
                      </select>
                      {errors.governorate ? <FieldError id="governorate-error">{errors.governorate}</FieldError> : null}
                    </label>
                  ) : (
                    <Field name="governorate" label={t("governorate")} error={errors.governorate} autoComplete="address-level1" value={draft.address.governorate} onChange={(event) => update({ address: { ...draft.address, governorate: event.target.value } })} />
                  )}
                  <Field name="city" label={t("city")} error={errors.city} autoComplete="address-level2" value={draft.address.city} onChange={(event) => update({ address: { ...draft.address, city: event.target.value } })} />
                  <Field name="addressLine1" label={t("street")} error={errors.addressLine1} autoComplete="address-line1" value={draft.address.addressLine1} onChange={(event) => update({ address: { ...draft.address, addressLine1: event.target.value } })} />
                  <Field name="addressLine2" label={t("apartment")} autoComplete="address-line2" value={draft.address.addressLine2 ?? ""} onChange={(event) => update({ address: { ...draft.address, addressLine2: event.target.value } })} />
                </>
              ) : config.pickupLocations.length === 1 ? (
                <PickupCard location={config.pickupLocations[0]!} />
              ) : (
                <div className="flex flex-col gap-3" role="radiogroup" aria-label={t("pickupFrom")}>
                  {config.pickupLocations.map((location) => (
                    <Choice key={location._id} name="pickupLocationId" value={location._id} checked={draft.pickupLocationId === location._id} onChange={() => update({ pickupLocationId: location._id })} title={localized(location.name, locale)} detail={<PickupDetail location={location} locale={locale} link={false} />} />
                  ))}
                  {errors.pickupLocationId ? <FieldError id="pickup-error">{errors.pickupLocationId}</FieldError> : null}
                </div>
              )}
              {fulfilmentProblem ? (
                <p className="flex items-start gap-1.5 text-[0.9375rem] font-medium text-critical" role="alert">
                  <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
                  {fulfilmentProblem}
                </p>
              ) : q?.fulfilment?.promisedWindow ? (
                <p className="text-[0.9375rem] text-positive" role="status">
                  {t("promisedWindow", { from: formatDate(locale, q.fulfilment.promisedWindow.from, timeZone, DATE_ONLY), to: formatDate(locale, q.fulfilment.promisedWindow.to, timeZone, DATE_ONLY) })}
                </p>
              ) : null}
            </Section>
          ) : null}

          <Section step={(modes.length > 1 ? 3 : 2) + (draft.mode ? 1 : 0)} title={t("payment")}>
            <div className="flex flex-col gap-3" role="radiogroup" aria-label={t("payment")}>
              {methods.map((option) => (
                <Choice key={option.method} name="paymentMethod" value={option.method} checked={draft.paymentMethod === option.method} onChange={() => (update({ paymentMethod: option.method }), track(addPaymentInfo(option.method)))} title={paymentMethodName(option.method, t)}>
                  <AnimatePresence initial={false}>
                    {draft.paymentMethod === option.method && (option.instructions || option.requiresProof) ? (
                      <motion.p initial={reduce ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={reduce ? undefined : { opacity: 0, height: 0 }} transition={{ duration: MOTION.standard, ease: MOTION.easeStandard }} className="overflow-hidden text-[0.875rem] text-ink-secondary">
                        {localized(option.instructions, locale)}
                        {option.requiresProof ? <span className="mt-1 block">{t("uploadLater")}</span> : null}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                </Choice>
              ))}
            </div>
            {errors.paymentMethod ? <FieldError id="payment-error">{errors.paymentMethod}</FieldError> : null}
          </Section>

          <Section step={(modes.length > 1 ? 4 : 3) + (draft.mode ? 1 : 0)} title={t("review")}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="order-notes" className="text-[0.9375rem] font-medium">
                {tp("orderNotesLabel")}
              </label>
              <textarea
                id="order-notes"
                name="notes"
                rows={3}
                maxLength={ORDER_NOTES_MAX}
                value={notes}
                onChange={(event) => (setNotes(event.target.value), (idempotencyKey.current = null), setFailure(null))}
                className="field min-h-24 resize-y"
                dir="auto"
                aria-describedby="order-notes-hint order-notes-count"
              />
              <p className="flex items-start justify-between gap-3 text-[0.8125rem] text-ink-muted">
                <span id="order-notes-hint">{tp("orderNotesHint")}</span>
                <span id="order-notes-count" className="tabular flex-none">
                  {tp("orderNotesCounter", { count: formatNumber(locale, notes.length), max: formatNumber(locale, ORDER_NOTES_MAX) })}
                </span>
              </p>
            </div>
            {guest && !draft.contact.email.trim() ? null : (
              <label className="flex items-start gap-3 border border-line-strong p-4">
                <input type="checkbox" name="newsletterOptIn" checked={newsletterOptIn} onChange={(event) => setNewsletterOptIn(event.target.checked)} className="mt-1 size-5 flex-none accent-[var(--sf-action)]" aria-describedby="newsletter-opt-in-hint" />
                <span className="text-[0.9375rem] leading-relaxed">
                  {tn("checkoutOptIn")}
                  <span id="newsletter-opt-in-hint" className="block text-[0.8125rem] text-ink-muted">
                    {tn("checkoutOptInHint")}
                  </span>
                </span>
              </label>
            )}
            <label className={cn("flex items-start gap-3 border p-4", errors.terms ? "border-critical" : "border-line-strong")}>
              {/* D-13: unticked by default, naming both documents, each opening in place. */}
              <input type="checkbox" name="terms" checked={draft.termsAccepted} onChange={(event) => (update({ termsAccepted: event.target.checked }), errors.terms && setErrors((current) => { const rest = { ...current }; delete rest.terms; return rest; }))} className="mt-1 size-5 flex-none accent-[var(--sf-action)]" aria-invalid={errors.terms ? true : undefined} aria-describedby={errors.terms ? "terms-error" : undefined} />
              <span className="text-[0.9375rem] leading-relaxed">
                {t("termsLabel")}{" "}
                <button type="button" onClick={() => setLegal("terms")} className="font-semibold text-action underline underline-offset-4">
                  {t("termsOfSale")}
                </button>
                {config.returns ? (
                  <>
                    {" "}
                    {t("and")}{" "}
                    <button type="button" onClick={() => setLegal("returns")} className="font-semibold text-action underline underline-offset-4">
                      {t("returnsPolicy")}
                    </button>
                  </>
                ) : null}
              </span>
            </label>
            {errors.terms ? <FieldError id="terms-error">{errors.terms}</FieldError> : null}
            {q && !q.shippingPending ? (
              <div className="flex items-center justify-between border-t border-line pt-4">
                <span className="font-semibold">{t("total")}</span>
                <span className="t-price">{formatPrice(locale, q.total, currency)}</span>
              </div>
            ) : null}
            {failure ? (
              <p role="alert" className="flex items-start gap-1.5 text-[0.9375rem] font-medium text-critical">
                <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
                <span>
                  {failure}{" "}
                  <Link href="/cart" className="underline underline-offset-4">
                    {t("backToCart")}
                  </Link>
                </span>
              </p>
            ) : null}
            <button type="submit" disabled={place.isPending || q?.hasUnavailableLines} className="btn btn-primary min-h-[52px] w-full text-base">
              {place.isPending ? t("placingOrder") : t("placeOrder")}
            </button>
          </Section>
        </form>

        <aside className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-[calc(72px+1.5rem)] bg-surface-muted p-6">
            <h2 className="t-heading mb-4">{t("orderSummary")}</h2>
            {q ? <SummaryBody quote={q} taxMode={taxMode} /> : <div className="h-40 animate-pulse bg-surface motion-reduce:animate-none" />}
          </div>
        </aside>
      </div>

      <Sheet open={legal !== null} onClose={() => setLegal(null)} side="bottom" title={legal === "returns" ? config.returns?.title ?? "" : config.terms.title} closeLabel={t("close")}>
        <div className="flex max-w-prose flex-col gap-3 whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink-secondary">{legal === "returns" ? config.returns?.body : config.terms.body}</div>
      </Sheet>
    </div>
  );
}

/**
 * Shaped like the form it stands for — title, then the five sections — and at
 * least a screen tall, so nothing visible moves when the real form arrives
 * (measured: a 60vh placeholder let the footer jump, CLS 0.198 at 375px).
 */
function CheckoutSkeleton() {
  const block = "animate-pulse bg-surface-muted motion-reduce:animate-none";
  return (
    <div className="container-sf min-h-[110svh] pt-4 pb-10 lg:pt-10" aria-busy="true">
      <div className={`mb-9 h-11 w-48 ${block}`} />
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col gap-10 lg:col-span-7">
          {[176, 120, 296, 208, 220].map((height, index) => (
            <div key={index} className={block} style={{ height }} />
          ))}
        </div>
        <div className={`hidden h-96 lg:col-span-5 lg:block ${block}`} />
      </div>
    </div>
  );
}

/** Nothing to check out — said at once, with the way back (no skeleton that collapses into it). */
function EmptyCheckout() {
  const t = useTranslations("common");
  return (
    <div className="container-sf flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="t-title">{t("emptyCart")}</h1>
      <Link href="/products" className="btn btn-primary">
        {t("startShopping")}
      </Link>
    </div>
  );
}

function PickupCard({ location }: { location: PickupLocation }) {
  const locale = useLocale() as Locale;
  return (
    <div className="flex items-start gap-3 border border-line-strong bg-surface p-4">
      <MapPin className="mt-0.5 size-5 flex-none text-support" aria-hidden="true" />
      <div>
        <p className="font-medium">{localized(location.name, locale)}</p>
        <PickupDetail location={location} locale={locale} link />
      </div>
    </div>
  );
}

/**
 * A pickup point's address and, where the merchant stored one, its phone — Western digits, isolated so RTL never
 * reorders it (D-10). A link in the single-location card; plain text inside a radio's label (no control in a control).
 */
function PickupDetail({ location, locale, link }: { location: PickupLocation; locale: Locale; link: boolean }) {
  const t = useTranslations("common");
  return (
    <>
      <span className="block text-[0.9375rem] text-ink-secondary">{localized(location.address, locale)}</span>
      {location.phone ? (
        <span className="block text-[0.9375rem] text-ink-secondary">
          <span className="sr-only">{t("phone")}: </span>
          {link ? (
            <a href={`tel:${location.phone.replace(/\s+/g, "")}`} className="inline-flex min-h-11 items-center underline-offset-4 hover:text-ink hover:underline">
              <bdi dir="ltr" className="code">
                {formatPhone(location.phone)}
              </bdi>
            </a>
          ) : (
            <bdi dir="ltr" className="code">
              {formatPhone(location.phone)}
            </bdi>
          )}
        </span>
      ) : null}
    </>
  );
}

/** The longest order note the backend accepts (`PlaceOrderDto.notes`, trimmed, max 500). */
const ORDER_NOTES_MAX = 500;

/** The promised window is a date range, not a time (MDS §14). */
const DATE_ONLY: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };
