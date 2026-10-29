"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { localized } from "@/lib/format/numerals";
import { linkHref } from "@/lib/links";
import type { StorefrontContent } from "@/lib/api/types";
import type { Locale } from "@/i18n/routing";

const DISMISSED_KEY = "sf-announcement-dismissed";

/**
 * design-system §13a: one message, optional link, static — no marquee, no
 * rotation. Dismissible, remembered for the session; a NEW message shows again
 * (the key carries the message text).
 */
export function AnnouncementBar({ announcement }: { announcement: StorefrontContent["announcement"] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const [hidden, setHidden] = useState(false);
  const text = announcement ? localized(announcement.message, locale) : "";

  useEffect(() => {
    try {
      if (text && window.sessionStorage.getItem(DISMISSED_KEY) === text) setHidden(true);
    } catch {
      /* storage blocked — shown */
    }
  }, [text]);

  if (!announcement || !text || hidden) return null;
  return (
    <div className="bg-support text-on-support">
      <div className="container-sf flex min-h-10 items-center justify-center gap-2 text-center text-[0.8125rem] font-medium">
        {announcement.link ? (
          <Link href={linkHref(announcement.link)} className="-my-0.5 inline-flex min-h-11 items-center underline-offset-4 hover:underline">
            {text}
          </Link>
        ) : (
          <span className="py-2">{text}</span>
        )}
        <button
          type="button"
          className="-my-0.5 -me-2 inline-flex size-11 flex-none items-center justify-center"
          aria-label={t("dismiss")}
          onClick={() => {
            setHidden(true);
            try {
              window.sessionStorage.setItem(DISMISSED_KEY, text);
            } catch {
              /* storage blocked */
            }
          }}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
