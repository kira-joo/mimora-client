"use client";

import { useId, useState } from "react";
import { Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Field, FieldError } from "@/components/checkout/fields";
import { useSubmitReview } from "@/lib/account/use-account";
import { apiMessage, apiStatus, fieldErrors } from "@/lib/api/errors";
import { formatNumber } from "@/lib/format/numerals";
import type { Locale } from "@/i18n/routing";
import { FormAlert, Notice } from "./states";

/** One product's review: an accessible 1–5 radio group (the chosen star is filled AND its number is announced), title, body. Moderated before it appears. */
export function ReviewForm({ productId, productName }: { productId: string; productName: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const submit = useSubmitReview();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [invalid, setInvalid] = useState(false);
  const group = useId();
  const server = fieldErrors(submit.error);
  const status = apiStatus(submit.error);

  if (submit.isSuccess) return <Notice>{t("reviewSent")}</Notice>;
  if (!open) {
    return (
      <button type="button" className="btn btn-secondary self-start" aria-label={t("writeReviewFor", { name: productName })} onClick={() => setOpen(true)}>
        {t("writeReview")}
      </button>
    );
  }
  return (
    <form
      noValidate
      className="flex max-w-xl flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (submit.isPending) return;
        setInvalid(!rating || !title.trim() || !body.trim());
        if (!rating || !title.trim() || !body.trim()) return;
        submit.mutate({ productId, rating, title: title.trim(), body: body.trim() });
      }}
    >
      {submit.isError ? <FormAlert>{status === 409 ? apiMessage(submit.error) ?? t("reviewNotAllowed") : t("reviewFailed")}</FormAlert> : null}
      <fieldset className="flex flex-col gap-2" aria-describedby={invalid && !rating ? `${group}-error` : undefined}>
        <legend className="text-[0.9375rem] font-medium">{t("reviewRating")}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="relative inline-flex size-11 cursor-pointer items-center justify-center has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus">
              <input type="radio" name={group} value={value} checked={rating === value} onChange={() => setRating(value)} className="peer sr-only" aria-label={t("ratingOutOf", { rating: formatNumber(locale, value) })} />
              <Star className={cn("size-7", value <= rating ? "fill-current text-action" : "text-ink-muted")} aria-hidden="true" />
            </label>
          ))}
        </div>
        {invalid && !rating ? <FieldError id={`${group}-error`}>{t("reviewRatingRequired")}</FieldError> : null}
      </fieldset>
      <Field name="title" label={t("reviewTitleLabel")} maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} error={invalid && !title.trim() ? t("required") : server.title} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${group}-body`} className="text-[0.9375rem] font-medium">
          {t("reviewBodyLabel")}
        </label>
        <textarea id={`${group}-body`} name="body" rows={5} maxLength={5000} className={cn("field py-3", ((invalid && !body.trim()) || server.body) && "border-critical")} aria-invalid={(invalid && !body.trim()) || server.body ? true : undefined} aria-describedby={(invalid && !body.trim()) || server.body ? `${group}-body-error` : undefined} value={body} onChange={(event) => setBody(event.target.value)} />
        {(invalid && !body.trim()) || server.body ? <FieldError id={`${group}-body-error`}>{server.body ?? t("required")}</FieldError> : null}
      </div>
      <p className="text-[0.875rem] text-ink-muted">{t("reviewModerated")}</p>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn btn-primary" disabled={submit.isPending}>
          {submit.isPending ? t("saving") : t("submitReview")}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
          {t("cancelAction")}
        </button>
      </div>
    </form>
  );
}
