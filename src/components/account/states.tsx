"use client";

import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/session/use-session";
import type { CustomerProfile } from "@/lib/api/types";

/** Shared account states (MDS §15): loading, failure with retry, empty with a next step, and the signed-out prompt. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  const t = useTranslations("common");
  return (
    <div aria-busy="true" aria-label={t("loading")} role="status" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-24 animate-pulse bg-surface-muted motion-reduce:animate-none" />
      ))}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry(): void }) {
  const t = useTranslations("common");
  return (
    <div className="flex flex-col items-start gap-3 py-8" role="alert">
      <h2 className="t-heading">{t("accLoadFailed")}</h2>
      <p className="text-ink-secondary">{t("cartUnavailableBody")}</p>
      <button type="button" className="btn btn-secondary" onClick={onRetry}>
        {t("tryAgain")}
      </button>
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-center gap-3 border border-dashed border-line-strong px-6 py-14 text-center">
      <span className="text-ink-muted" aria-hidden="true">
        {icon}
      </span>
      <h2 className="t-heading">{title}</h2>
      <p className="max-w-md text-ink-secondary">{body}</p>
      {action ? (
        <Link href={action.href} className="btn btn-primary mt-2">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 border border-critical px-4 py-3 text-[0.9375rem] font-medium text-critical">
      <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
      {children}
    </p>
  );
}

/** Polite confirmation of a completed action — announced, never colour-only. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="border border-line-strong bg-surface-muted px-4 py-3 text-[0.9375rem] font-medium">
      {children}
    </p>
  );
}

export function SignInPrompt() {
  const t = useTranslations("common");
  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <h1 className="t-title">{t("accSignInTitle")}</h1>
      <p className="max-w-md text-ink-secondary">{t("accSignInBody")}</p>
      <Link href="/login" className="btn btn-primary">
        {t("signIn")}
      </Link>
    </div>
  );
}

/**
 * Every account screen renders through this: a skeleton while the session
 * resolves, a sign-in prompt for a null or failed session (the proxy only
 * checks cookie presence, so an expired session lands here), never a blank page.
 */
export function SignedIn({ children, skeleton }: { children(customer: CustomerProfile): ReactNode; skeleton?: ReactNode }) {
  const session = useSession();
  if (session.isLoading) return <>{skeleton ?? <ListSkeleton />}</>;
  if (!session.data) return <SignInPrompt />;
  return <>{children(session.data)}</>;
}

export function PageHeading({ title, intro }: { title: string; intro?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      <h1 className="t-title">{title}</h1>
      {intro ? <p className="text-ink-secondary">{intro}</p> : null}
      <div className="rule" aria-hidden="true" />
    </div>
  );
}
