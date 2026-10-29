"use client";

import { useState } from "react";
import { CircleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Link, useRouter } from "@/i18n/navigation";
import { Field } from "@/components/checkout/fields";
import { apiStatus, fieldErrors } from "@/lib/api/errors";
import { newIdempotencyKey, sessionApi } from "@/lib/api/session-client";
import { SessionEndpoints } from "@/lib/api/session.endpoints";
import { loginHrefAfterSignup } from "@/lib/session/signup-handoff";
import { signUp as signUpEvent } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

/**
 * Create an account (D-9): phone is the login and the unique key; email is
 * optional. Neither can be verified yet (no SMS or email provider — D-8), so
 * nothing here promises a code. The backend answers the same `202` whether the
 * number was new or already registered (no account-existence oracle) and starts
 * no session, so this form never says which happened: it sends the customer to
 * sign in, phone prefilled, `redirectTo` preserved. The guest cart merges there.
 * One Idempotency-Key per submission: a double tap creates one account.
 */
export function SignupForm() {
  const t = useTranslations("common");
  const tp = useTranslations("common.privacy");
  const locale = useLocale() === "en" ? "en" : "ar";
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  // Unticked by default and separate from everything else (legal-and-consent.md §4): never pre-ticked, never bundled with accepting terms.
  const [marketing, setMarketing] = useState(false);
  const [key, setKey] = useState(() => newIdempotencyKey());
  const signUp = useMutation({
    mutationFn: () => sessionApi().request(SessionEndpoints.signup, { body: { name: form.name.trim(), phone: form.phone.trim(), password: form.password, ...(form.email.trim() ? { email: form.email.trim() } : {}), ...(marketing ? { marketingConsent: true, locale } : {}) }, headers: { "Idempotency-Key": key } }),
    onSuccess: () => {
      track(signUpEvent());
      router.replace(loginHrefAfterSignup(form.phone.trim(), params.get("redirectTo")));
    },
    onError: () => setKey(newIdempotencyKey()),
  });
  const errors = fieldErrors(signUp.error);
  const status = apiStatus(signUp.error);
  const failure = signUp.isError && !Object.keys(errors).length ? (status === 429 ? t("tooManyAttempts") : t("placeFailedGeneric")) : null;
  const set = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [field]: event.target.value }));

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        signUp.mutate();
      }}
    >
      {failure ? (
        <p role="alert" className="flex items-start gap-2 border border-critical px-4 py-3 text-[0.9375rem] font-medium text-critical">
          <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
          {failure}
        </p>
      ) : null}
      <Field name="name" label={t("fullName")} autoComplete="name" required value={form.name} onChange={set("name")} error={errors.name} />
      <Field name="phone" label={t("phone")} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" required value={form.phone} onChange={set("phone")} error={errors.phone} />
      <Field name="email" label={t("emailOptional")} type="email" autoComplete="email" dir="ltr" value={form.email} onChange={set("email")} error={errors.email} />
      <Field name="password" label={t("passwordNew")} type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={set("password")} error={errors.password} aria-describedby="password-hint" />
      <p id="password-hint" className="-mt-2 text-[0.8125rem] text-ink-muted">
        {t("passwordHint")}
      </p>
      <label className="flex items-start gap-3 py-1">
        <input type="checkbox" name="marketingConsent" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} className="mt-1 size-5 flex-none accent-[var(--sf-action)]" aria-describedby="marketing-hint" />
        <span className="text-[0.9375rem] leading-relaxed">
          {tp("marketingConsentLabel")}
          <span id="marketing-hint" className="block text-[0.8125rem] text-ink-muted">
            {tp("marketingConsentHint")}
          </span>
        </span>
      </label>
      <button type="submit" className="btn btn-primary w-full" disabled={signUp.isPending}>
        {signUp.isPending ? t("creatingAccount") : t("createAccount")}
      </button>
      <p className="text-[0.9375rem] text-ink-secondary">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-action underline-offset-4 hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}
