"use client";

import { useEffect, useRef, useState } from "react";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { needsChoice, type ConsentChoice } from "@/lib/analytics/consent";
import { onConsentSettingsOpen, useConsent, writeConsent } from "@/lib/analytics/consent-store";

/**
 * legal-and-consent.md §3-4. Every cookie here is strictly necessary or a preference
 * the visitor sets, EXCEPT analytics — so the notice is now a real choice about that
 * one thing: accept or decline, two identical buttons (same style, same size, same
 * place in the order of reading — declining is never the smaller or greyer option).
 *
 * It is still not a wall: a small panel that never blocks the funnel, never pre-selects
 * anything, and is rendered only after mount so it is not part of any cached page. The
 * choice is stored with the cookies text's version (`lib/analytics/consent.ts`), so a
 * new version asks again; the footer's "Cookie settings" (`CookieSettingsLink`) reopens
 * it to change the choice later.
 *
 * Accessible by construction: a labelled `region` (not a trapping dialog — nothing is
 * blocked behind it), native buttons reachable in order, Escape closes a reopened panel,
 * focus moves to it ONLY when the visitor asked for it (the footer link), and the saved
 * choice is announced from a live region that outlives the panel.
 */
export function CookieNotice() {
  const t = useTranslations("common.analytics");
  const consent = useConsent();
  const mounted = useHydrated();
  const [reopened, setReopened] = useState(false);
  const [saved, setSaved] = useState(false);
  const firstButton = useRef<HTMLButtonElement>(null);

  useEffect(
    () =>
      onConsentSettingsOpen(() => {
        setSaved(false);
        setReopened(true);
      }),
    []
  );

  const visible = mounted && (needsChoice(consent) || reopened);

  // Focus follows an explicit request (the footer link), never an automatic first-visit appearance.
  useEffect(() => {
    if (reopened) firstButton.current?.focus();
  }, [reopened]);

  function choose(choice: ConsentChoice) {
    writeConsent(choice);
    setReopened(false);
    setSaved(true);
  }

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {saved ? t("saved") : ""}
      </p>
      {visible ? (
        <div
          role="region"
          aria-label={t("noticeLabel")}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !needsChoice(consent)) setReopened(false);
          }}
          className="fixed inset-x-3 bottom-[calc(0.75rem+var(--sf-tabbar-space,0px))] z-40 border border-line bg-surface p-4 shadow-[var(--sf-elevation-sheet)] sm:inset-x-auto sm:start-6 sm:bottom-[calc(1.5rem+var(--sf-tabbar-space,0px))] sm:max-w-sm lg:pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <p className="text-[0.875rem] text-ink-secondary">
            {t("noticeBody")}{" "}
            <Link href="/pages/cookies" className="font-medium text-ink underline underline-offset-4">
              {t("details")}
            </Link>
          </p>
          {needsChoice(consent) ? null : <p className="mt-2 text-[0.875rem] font-medium">{consent.status === "granted" ? t("currentOn") : t("currentOff")}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button ref={firstButton} type="button" className="btn btn-secondary min-h-11" onClick={() => choose("granted")}>
              {t("accept")}
            </button>
            <button type="button" className="btn btn-secondary min-h-11" onClick={() => choose("denied")}>
              {t("decline")}
            </button>
          </div>
          {reopened && !needsChoice(consent) ? (
            <button type="button" className="mt-2 inline-flex min-h-11 items-center text-[0.875rem] text-ink-secondary underline underline-offset-4" onClick={() => setReopened(false)}>
              {t("close")}
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
