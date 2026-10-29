"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Field } from "@/components/checkout/fields";
import { Link } from "@/i18n/navigation";
import { useChangePassword, useEndSessionLocally, useUpdateProfile } from "@/lib/account/use-account";
import { useSetMarketingConsent } from "@/lib/account/use-marketing-consent";
import { apiStatus, fieldErrors } from "@/lib/api/errors";
import type { CustomerProfile } from "@/lib/api/types";
import { formatPhone } from "@/lib/format/numerals";
import { FormAlert, Notice, PageHeading, SignedIn } from "./states";

export function ProfileView() {
  const t = useTranslations("common");
  const endSession = useEndSessionLocally();
  const [passwordChanged, setPasswordChanged] = useState(false);
  // Outside SignedIn on purpose: the session is gone by now, and this screen is what explains why.
  if (passwordChanged)
    return (
      <div className="flex max-w-md flex-col items-start gap-4 py-12" role="status">
        <h1 className="t-title">{t("passwordChangedTitle")}</h1>
        <p className="text-ink-secondary">{t("passwordChangedBody")}</p>
        <Link href="/login" className="btn btn-primary">
          {t("signIn")}
        </Link>
      </div>
    );
  return (
    <SignedIn>
      {(customer) => (
        <>
          <PageHeading title={t("profileTitle")} />
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="flex flex-col gap-12">
              <DetailsForm customer={customer} />
              <MarketingConsentControl customer={customer} />
            </div>
            <PasswordForm
              onChanged={() => {
                setPasswordChanged(true);
                endSession();
              }}
            />
          </div>
        </>
      )}
    </SignedIn>
  );
}

function DetailsForm({ customer }: { customer: CustomerProfile }) {
  const t = useTranslations("common");
  const update = useUpdateProfile();
  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email ?? "");
  const [missingName, setMissingName] = useState(false);
  const server = fieldErrors(update.error);
  const duplicate = apiStatus(update.error) === 409;
  const generic = update.isError && !Object.keys(server).length && !duplicate;

  return (
    <form
      noValidate
      className="flex max-w-md flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (update.isPending) return;
        setMissingName(!name.trim());
        if (!name.trim()) return;
        update.mutate({ name: name.trim(), ...(email.trim() ? { email: email.trim() } : {}) });
      }}
    >
      <h2 className="t-heading">{t("profileDetails")}</h2>
      {generic ? <FormAlert>{t("profileSaveFailed")}</FormAlert> : null}
      {update.isSuccess ? <Notice>{t("profileSaved")}</Notice> : null}
      <Field name="name" label={t("fullName")} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} error={missingName ? t("required") : server.name} />
      <Field name="email" label={t("emailOptional")} type="email" inputMode="email" autoComplete="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} error={duplicate ? t("emailTaken") : server.email ? t("emailInvalid") : undefined} />
      <div className="flex flex-col gap-1.5">
        <span className="text-[0.9375rem] font-medium">{t("phone")}</span>
        <bdi dir="ltr" className="self-start font-medium">
          {formatPhone(customer.phone)}
        </bdi>
        <p className="text-[0.875rem] text-ink-muted">{t("phoneReadOnlyNote")}</p>
      </div>
      <button type="submit" className="btn btn-primary self-start" disabled={update.isPending}>
        {update.isPending ? t("saving") : t("saveChanges")}
      </button>
    </form>
  );
}

function PasswordForm({ onChanged }: { onChanged(): void }) {
  const t = useTranslations("common");
  const change = useChangePassword();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [tooShort, setTooShort] = useState(false);
  const server = fieldErrors(change.error);
  const wrong = apiStatus(change.error) === 401;
  const generic = change.isError && !wrong && !Object.keys(server).length;

  return (
    <form
      noValidate
      className="flex max-w-md flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (change.isPending || !oldPassword) return;
        setTooShort(newPassword.length < 8);
        if (newPassword.length < 8) return;
        change.mutate({ oldPassword, newPassword }, { onSuccess: onChanged });
      }}
    >
      <h2 className="t-heading">{t("passwordSection")}</h2>
      <p className="text-[0.9375rem] text-ink-secondary">{t("passwordSectionBody")}</p>
      {generic ? <FormAlert>{t("placeFailedGeneric")}</FormAlert> : null}
      <Field name="oldPassword" label={t("passwordCurrent")} type="password" autoComplete="current-password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} error={wrong ? t("passwordWrong") : server.oldPassword} />
      <Field name="newPassword" label={t("passwordNew")} type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} error={tooShort || server.newPassword ? t("passwordTooShort") : undefined} />
      <p className="-mt-2 text-[0.875rem] text-ink-muted">{t("passwordHint")}</p>
      <button type="submit" className="btn btn-primary self-start" disabled={change.isPending || !oldPassword || !newPassword}>
        {change.isPending ? t("saving") : t("passwordSection")}
      </button>
    </form>
  );
}

/**
 * Marketing consent: one control, effective immediately, no dark pattern (legal-and-consent.md §4).
 * It reflects what the SERVER says, shows plainly whether messages are on or off, and says
 * that order updates are unaffected — withdrawing consent must never feel like it risks the order.
 */
function MarketingConsentControl({ customer }: { customer: CustomerProfile }) {
  const t = useTranslations("common.privacy");
  const set = useSetMarketingConsent();
  const granted = customer.marketingConsent?.granted === true;
  return (
    <section className="flex max-w-md flex-col gap-3" aria-labelledby="marketing-title">
      <h2 id="marketing-title" className="t-heading">
        {t("marketingAccountTitle")}
      </h2>
      <p className="text-[0.9375rem] text-ink-secondary">{t("marketingAccountBody")}</p>
      {set.isError ? <FormAlert>{t("marketingSaveFailed")}</FormAlert> : null}
      <label className="flex min-h-11 items-start gap-3">
        <input
          type="checkbox"
          name="marketingConsent"
          checked={granted}
          disabled={set.isPending}
          onChange={(event) => set.mutate(event.target.checked)}
          className="mt-1 size-5 flex-none accent-[var(--sf-action)]"
          aria-describedby="marketing-status"
        />
        <span className="text-[0.9375rem] font-medium leading-relaxed">{t("marketingToggleLabel")}</span>
      </label>
      <p id="marketing-status" role="status" aria-live="polite" className="text-[0.875rem] text-ink-muted">
        {granted ? t("marketingToggleOn") : t("marketingToggleOff")}
      </p>
    </section>
  );
}
