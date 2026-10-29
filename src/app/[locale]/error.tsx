"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * A page that failed to render — said plainly, with a retry and a way back.
 * Nothing about the failure is shown to the customer; it is logged for us.
 */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset(): void }) {
  const t = useTranslations("common");
  useEffect(() => {
    console.error("[storefront] page error", error.digest ?? error.message);
  }, [error]);
  return (
    <div className="container-sf flex min-h-[50dvh] flex-col items-start justify-center gap-4 py-16" role="alert">
      <h1 className="t-title">{t("errorTitle")}</h1>
      <p className="max-w-md text-ink-secondary">{t("errorBody")}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={reset}>
          {t("tryAgain")}
        </button>
        <Link href="/" className="btn btn-secondary">
          {t("backToShop")}
        </Link>
      </div>
    </div>
  );
}
