"use client";

import { useTranslations } from "next-intl";
import { openConsentSettings } from "@/lib/analytics/consent-store";

/** The footer's way back to the analytics choice — a real button (it acts, it does not navigate), as large as its neighbours. */
export function CookieSettingsLink() {
  const t = useTranslations("common.privacy");
  return (
    <button type="button" onClick={openConsentSettings} className="inline-flex min-h-11 items-center text-start text-[0.9375rem] text-ink-secondary hover:text-ink">
      {t("cookieSettings")}
    </button>
  );
}
