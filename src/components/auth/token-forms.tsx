"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { Field } from "@/components/checkout/fields";
import { apiStatus, fieldErrors } from "@/lib/api/errors";
import { newIdempotencyKey, sessionApi } from "@/lib/api/session-client";
import { SessionEndpoints } from "@/lib/api/session.endpoints";

/** Set a new password from a reset link. Every failure reads the same (invalid or expired) — as the backend answers. */
export function ResetPasswordForm() {
  const t = useTranslations("common");
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const reset = useMutation({ mutationFn: () => sessionApi().request(SessionEndpoints.resetPassword, { body: { token, newPassword: password }, headers: { "Idempotency-Key": newIdempotencyKey() } }) });
  if (!token) return <p className="text-ink-secondary">{t("resetLinkMissing")}</p>;
  if (reset.isSuccess) {
    return (
      <div className="flex flex-col items-start gap-4" role="status">
        <CheckCircle2 className="size-8 text-positive" aria-hidden="true" />
        <p>{t("passwordResetDone")}</p>
        <Link href="/login" className="btn btn-primary">
          {t("signIn")}
        </Link>
      </div>
    );
  }
  const errors = fieldErrors(reset.error);
  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={(event) => (event.preventDefault(), reset.mutate())}>
      {reset.isError && !errors.newPassword ? (
        <p role="alert" className="flex items-start gap-2 border border-critical px-4 py-3 text-[0.9375rem] font-medium text-critical">
          <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
          {apiStatus(reset.error) === 429 ? t("tooManyAttempts") : t("resetLinkInvalid")}
        </p>
      ) : null}
      <Field name="newPassword" label={t("passwordNew")} type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} error={errors.newPassword} />
      <p className="-mt-2 text-[0.8125rem] text-ink-muted">{t("passwordHint")}</p>
      <button type="submit" className="btn btn-primary w-full" disabled={reset.isPending || password.length < 8}>
        {t("setPassword")}
      </button>
    </form>
  );
}

/** Confirms an email address from its link, once, on arrival. */
export function VerifyEmailStatus() {
  const t = useTranslations("common");
  const token = useSearchParams().get("token") ?? "";
  const started = useRef(false);
  const verify = useMutation({ mutationFn: () => sessionApi().request(SessionEndpoints.verifyEmail, { body: { token }, headers: { "Idempotency-Key": newIdempotencyKey() } }) });
  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      verify.mutate();
    }
  }, [token, verify]);
  if (!token || verify.isError) return <p className="font-medium text-critical" role="alert">{t("verifyLinkInvalid")}</p>;
  if (verify.isSuccess) return <p className="font-medium text-positive" role="status">{t("emailVerified")}</p>;
  return <p className="text-ink-secondary" role="status">{t("verifying")}</p>;
}
