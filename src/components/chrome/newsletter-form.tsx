"use client";

import { useId, useState } from "react";
import { CircleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { apiStatus } from "@/lib/api/errors";
import { sessionApi } from "@/lib/api/session-client";
import { SessionPrivacyEndpoints } from "@/lib/api/privacy.endpoints";

/**
 * Newsletter capture (#42 — capture only, nothing sends). One field; the answer is the
 * same whether the address was new or already on the list, so this never says which. It is
 * double opt-in: submitting asks for a confirmation email, it does not subscribe, so the
 * message says "check your inbox", never "you're on the list" — and tells a stranger nothing. Optional,
 * unticked-by-design (submitting IS the consent), and never part of any required flow.
 */
export function NewsletterForm() {
  const t = useTranslations("common.newsletter");
  const confirmT = useTranslations("common.newsletterConfirm");
  const locale = useLocale() === "en" ? "en" : "ar";
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "invalid" | "tooMany" | "failed">("idle");

  async function submit() {
    const value = email.trim();
    if (!value.includes("@")) return setState("invalid");
    setState("sending");
    try {
      await sessionApi().request(SessionPrivacyEndpoints.newsletter, { body: { email: value, locale, source: "footer" } });
      setEmail("");
      setState("done");
    } catch (error) {
      const status = apiStatus(error);
      setState(status === 400 ? "invalid" : status === 429 ? "tooMany" : "failed");
    }
  }

  const error = state === "invalid" ? t("invalid") : state === "tooMany" ? t("tooMany") : state === "failed" ? t("failed") : null;
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (state !== "sending") void submit();
      }}
    >
      <h3 className="t-heading">{t("title")}</h3>
      <p className="max-w-xs text-[0.9375rem] text-ink-secondary">{t("body")}</p>
      <label htmlFor={id} className="sr-only">
        {t("emailLabel")}
      </label>
      <div className="flex max-w-xs flex-col gap-2 sm:flex-row">
        <input
          id={id}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          required
          value={email}
          onChange={(event) => (setEmail(event.target.value), state !== "idle" && state !== "sending" && setState("idle"))}
          placeholder={t("emailLabel")}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-status` : undefined}
          className="field min-w-0 flex-1"
        />
        <button type="submit" className="btn btn-secondary min-h-11" disabled={state === "sending"}>
          {state === "sending" ? t("submitting") : t("submit")}
        </button>
      </div>
      <p id={`${id}-status`} role="status" aria-live="polite" className={error ? "flex items-center gap-1.5 text-[0.875rem] font-medium text-critical" : "text-[0.875rem] font-medium text-positive"}>
        {error ? <CircleAlert className="size-4 flex-none" aria-hidden="true" /> : null}
        {error ?? (state === "done" ? confirmT("checkEmail") : "")}
      </p>
    </form>
  );
}
