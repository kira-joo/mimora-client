"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { newIdempotencyKey, sessionApi } from "@/lib/api/session-client";
import { SessionPrivacyEndpoints } from "@/lib/api/privacy.endpoints";

/**
 * Confirms a newsletter subscription from its emailed link, once, on arrival (double opt-in). Same shape as
 * `VerifyEmailStatus`: every failure reads the same — the link is invalid or expired — because the backend
 * does not say which, and a guest has no session to refresh, so a refusal never starts a refresh.
 */
export function NewsletterConfirmStatus() {
  const t = useTranslations("common.newsletterConfirm");
  const token = useSearchParams().get("token") ?? "";
  const started = useRef(false);
  const confirm = useMutation({
    mutationFn: () => sessionApi().request(SessionPrivacyEndpoints.confirmNewsletter, { body: { token }, headers: { "Idempotency-Key": newIdempotencyKey() }, skipAuthRefresh: true }),
  });
  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      confirm.mutate();
    }
  }, [token, confirm]);

  if (!token || confirm.isError) return <p className="font-medium text-critical" role="alert">{t("invalid")}</p>;
  if (confirm.isSuccess) {
    return (
      <div className="flex flex-col items-start gap-4" role="status">
        <p className="font-medium text-positive">{t("done")}</p>
        <Link href="/" className="btn btn-secondary">
          {t("continue")}
        </Link>
      </div>
    );
  }
  return <p className="text-ink-secondary" role="status">{t("confirming")}</p>;
}
