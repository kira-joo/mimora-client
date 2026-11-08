"use client";

import { useEffect, useState } from "react";
import { CircleAlert, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { Field } from "@/components/checkout/fields";
import { apiStatus, fieldErrors } from "@/lib/api/errors";
import { takeSignupPhone } from "@/lib/session/signup-handoff";
import { safeRedirect } from "@/lib/session/safe-redirect";
import { useSignIn } from "@/lib/session/use-session";
import { login as loginEvent } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

/**
 * Phone-first sign-in (D-9). Arriving from signup (`?registered=1`) shows one fixed
 * notice with the phone prefilled — the same whether or not the number was already
 * registered. Every failure — wrong password, unknown phone,
 * disabled account — reads the same, as the backend answers it; nothing here
 * distinguishes them. A guest cart is merged on success (server-side), so the
 * whole client cache is refreshed.
 */
export function LoginForm() {
  const t = useTranslations("common");
  const router = useRouter();
  const params = useSearchParams();
  const signIn = useSignIn();
  const [phone, setPhone] = useState("");
  // After mount, never in the initial state: the server cannot see sessionStorage, and a differing
  // first render is a hydration mismatch.
  useEffect(() => {
    const handedOver = takeSignupPhone();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads a consume-once, browser-only value (sessionStorage) after hydration; it cannot be in the initial state without a hydration mismatch.
    if (handedOver) setPhone((current) => current || handedOver);
  }, []);
  const [password, setPassword] = useState("");
  const errors = fieldErrors(signIn.error);
  const status = apiStatus(signIn.error);
  const failure = signIn.isError && !Object.keys(errors).length ? (status === 429 ? t("tooManyAttempts") : status === 401 ? t("loginFailed") : t("placeFailedGeneric")) : null;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!phone.trim() || !password) return;
        signIn.mutate({ phone: phone.trim(), password }, {
            onSuccess: () => {
              track(loginEvent());
              router.replace(safeRedirect(params.get("redirectTo")));
            },
          });
      }}
    >
      {params.get("registered") === "1" && !failure ? (
        <p role="status" className="flex items-start gap-2 border border-line bg-surface-muted px-4 py-3 text-[0.9375rem] text-ink-secondary">
          <Info className="mt-0.5 size-4 flex-none" aria-hidden="true" />
          {t("signupContinue")}
        </p>
      ) : null}
      {failure ? (
        <p role="alert" className="flex items-start gap-2 border border-critical px-4 py-3 text-[0.9375rem] font-medium text-critical">
          <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
          {failure}
        </p>
      ) : null}
      <Field name="phone" label={t("phone")} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" required value={phone} onChange={(event) => setPhone(event.target.value)} error={errors.phone} />
      <Field name="password" label={t("password")} type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} error={errors.password} />
      <button type="submit" className="btn btn-primary w-full" disabled={signIn.isPending || !phone.trim() || !password}>
        {signIn.isPending ? t("signingIn") : t("signIn")}
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3 text-[0.9375rem]">
        <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-ink-secondary underline underline-offset-4 hover:text-ink">
          {t("forgotPassword")}
        </Link>
        <Link href={{ pathname: "/signup", query: params.get("redirectTo") ? { redirectTo: params.get("redirectTo")! } : {} }} className="inline-flex min-h-11 items-center font-semibold text-action underline-offset-4 hover:underline">
          {t("createAccount")}
        </Link>
      </div>
    </form>
  );
}
