"use client";

import { useId, useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Field, FieldError } from "@/components/checkout/fields";
import { addressToForm, EMPTY_ADDRESS, formToAddressBody, governorateOptions, addressProblems, type AddressForm } from "@/lib/account/account-model";
import { useAddresses, useCreateAddress, useDeleteAddress, useUpdateAddress } from "@/lib/account/use-account";
import { apiStatus, fieldErrors } from "@/lib/api/errors";
import type { Address, DeliveryZone } from "@/lib/api/types";
import { formatPhone } from "@/lib/format/numerals";
import type { Locale } from "@/i18n/routing";
import { EmptyState, ErrorState, FormAlert, ListSkeleton, Notice, PageHeading, SignedIn } from "./states";

type Editing = { mode: "new" } | { mode: "edit"; address: Address } | null;

export function AddressesView({ zones }: { zones: Pick<DeliveryZone, "name">[] }) {
  const t = useTranslations("common");
  const addresses = useAddresses();
  const update = useUpdateAddress();
  const remove = useDeleteAddress();
  const [editing, setEditing] = useState<Editing>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const rows = addresses.data?.addresses ?? [];

  return (
    <SignedIn>
      {() => (
        <>
          <PageHeading title={t("addressesTitle")} />
          {notice ? (
            <div className="mb-4">
              <Notice>{notice}</Notice>
            </div>
          ) : null}
          {editing ? (
            <AddressForm
              key={editing.mode === "edit" ? editing.address._id : "new"}
              zones={zones}
              address={editing.mode === "edit" ? editing.address : undefined}
              isFirst={rows.length === 0}
              onDone={(message) => {
                setEditing(null);
                if (message) setNotice(message);
              }}
            />
          ) : addresses.isLoading ? (
            <ListSkeleton />
          ) : addresses.isError ? (
            <ErrorState onRetry={() => addresses.refetch()} />
          ) : (
            <>
              {rows.length === 0 ? (
                <EmptyState icon={<MapPin className="size-10" />} title={t("addressesEmptyTitle")} body={t("addressesEmptyBody")} />
              ) : (
                <ul className="grid gap-4 md:grid-cols-2">
                  {rows.map((address) => (
                    <AddressCard
                      key={address._id}
                      address={address}
                      pendingDefault={update.isPending && update.variables?.id === address._id}
                      onEdit={() => (setNotice(null), setEditing({ mode: "edit", address }))}
                      onMakeDefault={() => update.mutate({ id: address._id, body: { isDefault: true } })}
                      deleting={remove.isPending}
                      onDelete={() => remove.mutate(address._id, { onSuccess: () => setNotice(t("addressDeleted")) })}
                    />
                  ))}
                </ul>
              )}
              {update.isError || remove.isError ? (
                <div className="mt-4">
                  <FormAlert>{t("addressActionFailed")}</FormAlert>
                </div>
              ) : null}
              <button type="button" className="btn btn-primary mt-6" onClick={() => (setNotice(null), setEditing({ mode: "new" }))}>
                <Plus className="size-4" aria-hidden="true" />
                {t("addAddress")}
              </button>
            </>
          )}
        </>
      )}
    </SignedIn>
  );
}

function AddressCard({ address, pendingDefault, deleting, onEdit, onMakeDefault, onDelete }: { address: Address; pendingDefault: boolean; deleting: boolean; onEdit(): void; onMakeDefault(): void; onDelete(): void }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const [confirming, setConfirming] = useState(false);
  const joiner = locale === "ar" ? "، " : ", ";
  return (
    <li className={cn("flex flex-col gap-3 border bg-surface p-5", address.isDefault ? "border-ink" : "border-line-strong")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="t-heading">{address.label}</h2>
        {address.isDefault ? <span className="border border-ink px-2 py-0.5 text-[0.8125rem] font-semibold">{t("defaultBadge")}</span> : null}
      </div>
      <p className="text-[0.9375rem]">
        <span className="font-medium">{address.recipientName}</span>
        <span className="block text-ink-secondary">{[address.addressLine1, address.addressLine2, address.city, address.governorate, address.postalCode].filter(Boolean).join(joiner)}</span>
        <bdi dir="ltr" className="block text-ink-secondary">
          {formatPhone(address.phone)}
        </bdi>
      </p>
      {confirming ? (
        <div className="flex flex-col gap-3 border-t border-line pt-3">
          <p className="font-medium">{t("deleteAddressConfirm")}</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn btn-secondary border-critical text-critical" disabled={deleting} onClick={onDelete}>
              {t("deleteYes")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)}>
              {t("keepIt")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-5 border-t border-line pt-1">
          <button type="button" className="inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-medium underline underline-offset-4" aria-label={t("editAddressNamed", { label: address.label })} onClick={onEdit}>
            <Pencil className="size-4" aria-hidden="true" />
            {t("edit")}
          </button>
          {address.isDefault ? null : (
            <button type="button" className="inline-flex min-h-11 items-center text-[0.9375rem] font-medium underline underline-offset-4 disabled:text-ink-muted" aria-label={t("setDefaultNamed", { label: address.label })} disabled={pendingDefault} onClick={onMakeDefault}>
              {pendingDefault ? t("saving") : t("setDefault")}
            </button>
          )}
          <button type="button" className="inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-medium text-critical underline underline-offset-4" aria-label={t("deleteAddressNamed", { label: address.label })} onClick={() => setConfirming(true)}>
            <Trash2 className="size-4" aria-hidden="true" />
            {t("deleteAddress")}
          </button>
        </div>
      )}
    </li>
  );
}

function AddressForm({ zones, address, isFirst, onDone }: { zones: Pick<DeliveryZone, "name">[]; address?: Address; isFirst: boolean; onDone(message?: string): void }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const create = useCreateAddress();
  const update = useUpdateAddress();
  const mutation = address ? update : create;
  const [form, setForm] = useState<AddressForm>(address ? addressToForm(address) : { ...EMPTY_ADDRESS, isDefault: isFirst });
  const [problems, setProblems] = useState<ReturnType<typeof addressProblems>>({});
  const server = fieldErrors(mutation.error);
  const status = apiStatus(mutation.error);
  const set = (key: keyof AddressForm) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const error = (key: keyof AddressForm) => (problems[key] === "required" ? t("required") : problems[key] === "phoneInvalid" ? t("phoneInvalid") : server[key]);
  const options = governorateOptions(zones, locale, address?.governorate);
  const failed = mutation.isError && !Object.keys(server).length;
  const defaultId = useId();

  return (
    <form
      noValidate
      className="flex max-w-xl flex-col gap-4"
      aria-labelledby={`${defaultId}-title`}
      onSubmit={(event) => {
        event.preventDefault();
        if (mutation.isPending) return;
        const found = addressProblems(form);
        setProblems(found);
        if (Object.keys(found).length) return;
        const body = formToAddressBody(form);
        if (address) update.mutate({ id: address._id, body }, { onSuccess: () => onDone(t("addressSaved")) });
        else create.mutate(body, { onSuccess: () => onDone(t("addressSaved")) });
      }}
    >
      <h2 id={`${defaultId}-title`} className="t-heading">
        {address ? t("editAddress") : t("addAddress")}
      </h2>
      {mutation.isError ? <FormAlert>{failed ? (status === 429 ? t("tooManyAttempts") : t("addressSaveFailed")) : t("addressSaveFailed")}</FormAlert> : null}
      <Field name="label" label={t("addressLabel")} autoComplete="off" value={form.label} onChange={set("label")} error={error("label")} />
      <Field name="recipientName" label={t("recipientName")} autoComplete="name" value={form.recipientName} onChange={set("recipientName")} error={error("recipientName")} />
      <Field name="phone" label={t("phone")} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={form.phone} onChange={set("phone")} error={error("phone")} />
      {options.length ? <SelectField name="governorate" label={t("governorate")} placeholder={t("chooseGovernorate")} options={options} value={form.governorate} onChange={set("governorate")} error={error("governorate")} /> : <Field name="governorate" label={t("governorate")} autoComplete="address-level1" value={form.governorate} onChange={set("governorate")} error={error("governorate")} />}
      <Field name="city" label={t("city")} autoComplete="address-level2" value={form.city} onChange={set("city")} error={error("city")} />
      <Field name="addressLine1" label={t("street")} autoComplete="address-line1" value={form.addressLine1} onChange={set("addressLine1")} error={error("addressLine1")} />
      <Field name="addressLine2" label={t("apartment")} autoComplete="address-line2" value={form.addressLine2} onChange={set("addressLine2")} error={error("addressLine2")} />
      <Field name="postalCode" label={t("postalCodeOptional")} inputMode="numeric" autoComplete="postal-code" dir="ltr" value={form.postalCode} onChange={set("postalCode")} error={error("postalCode")} />
      <label className="flex min-h-11 cursor-pointer items-center gap-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus">
        <input type="checkbox" className="size-5 flex-none accent-[var(--sf-action)]" checked={form.isDefault} onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))} />
        <span className="text-[0.9375rem] font-medium">{t("makeDefaultCheck")}</span>
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? t("saving") : t("saveAddress")}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => onDone()}>
          {t("cancelAction")}
        </button>
      </div>
    </form>
  );
}

function SelectField({ name, label, placeholder, options, error, ...select }: { name: string; label: string; placeholder: string; options: Array<{ value: string; label: string }>; error?: string; value: string; onChange(event: { target: { value: string } }): void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.9375rem] font-medium">
        {label}
      </label>
      <select id={id} name={name} className={cn("field", error && "border-critical")} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} autoComplete="address-level1" {...select}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  );
}
