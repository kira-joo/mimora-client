"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { formatNumber } from "@/lib/format/numerals";
import type { Locale } from "@/i18n/routing";

/*
 * The checkout's form primitives. Every input is labelled; an error is linked
 * with aria-describedby, sets aria-invalid, and never relies on colour alone
 * (an icon and words accompany it) — MDS §20.
 */
export function Section({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <span className="tabular text-[0.8125rem] font-medium text-ink-muted">{t("step", { n: formatNumber(locale, step) })}</span>
        <h2 id={id} className="t-heading">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export function Field({ name, label, error, ...input }: { name: string; label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.9375rem] font-medium">
        {label}
      </label>
      <input id={id} name={name} className={cn("field", error && "border-critical")} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} {...input} />
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  );
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-[0.875rem] font-medium text-critical">
      <CircleAlert className="size-4 flex-none" aria-hidden="true" />
      {children}
    </p>
  );
}

export function Choice({ name, value, checked, onChange, title, meta, detail, children }: { name: string; value: string; checked: boolean; onChange(): void; title: string; meta?: string; detail?: ReactNode; children?: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 border bg-surface p-4 transition-[border-color,box-shadow] duration-[var(--sf-duration-fast)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus", checked ? "border-ink shadow-[inset_0_0_0_1px_var(--sf-ink)]" : "border-line-strong")}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="mt-1 size-5 flex-none accent-[var(--sf-action)]" />
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
