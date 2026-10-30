import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { HandHeart } from "./ornaments";

/** The title, with its heart bound to the last word so the two can never part across a line break. */
export function TitleWithHeart({ title, className = "size-[0.55em]" }: { title: string; className?: string }) {
  const cut = title.lastIndexOf(" ");
  return (
    <>
      {cut > 0 ? `${title.slice(0, cut)} ` : null}
      <span className="whitespace-nowrap">
        {cut > 0 ? title.slice(cut + 1) : title}
        <HandHeart className={`ms-2 inline-block -translate-y-[0.55em] text-ornament ${className}`} />
      </span>
    </>
  );
}

/** A section's title with its small hand-drawn heart, an optional line beneath, and the link to the whole set at the reading end. */
export function SectionHead({ title, subline, action }: { title: string; subline?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 lg:mb-8">
      <div className="min-w-0">
        <h2 className="t-title">
          <TitleWithHeart title={title} />
        </h2>
        {subline ? <p className="mt-1 text-[0.9375rem] text-ink-muted">{subline}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ViewAll({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 flex-none items-center gap-1.5 rounded-full px-2 text-[0.875rem] font-semibold text-action-ink underline-offset-4 hover:text-heading hover:underline lg:text-[0.9375rem]">
      {label}
      <ArrowLeft className="size-4 ltr:-scale-x-100" aria-hidden="true" />
    </Link>
  );
}
