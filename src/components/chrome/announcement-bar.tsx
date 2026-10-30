"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { localized } from "@/lib/format/numerals";
import { linkHref } from "@/lib/links";
import type { StorefrontContent } from "@/lib/api/types";
import { Sparkle } from "@/components/home/ornaments";
import { useStore } from "@/components/providers/store-context";
import { LOCALES, type Locale } from "@/i18n/routing";
import { LocaleSwitch } from "./locale-switch";

/**
 * The band above the header: one static message (no marquee, no rotation), an
 * optional link, and the language switch at the reading end. The band is shown when
 * there is a message OR a language to switch to — the switch must not disappear with
 * the announcement. Its colour is the Mimora `band` token, chosen to carry white
 * text at AA.
 */
export function AnnouncementBar({ announcement }: { announcement: StorefrontContent["announcement"] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const { supportedLocales } = useStore();
  const text = announcement ? localized(announcement.message, locale) : "";
  const canSwitch = LOCALES.some((candidate) => candidate !== locale && (supportedLocales ?? LOCALES).includes(candidate));

  if (!text && !canSwitch) return null;
  return (
    <div className="bg-band text-on-band" role="region" aria-label={t("announcementRegion")}>
      <div className="container-sf grid min-h-10 grid-cols-[1fr_auto] items-center gap-2 lg:grid-cols-[1fr_auto_1fr]">
        <span className="hidden lg:block" aria-hidden="true" />
        {text ? (
          <p className="flex items-center justify-center gap-2 py-1.5 text-center text-[0.75rem] font-medium leading-snug max-lg:col-start-1 max-lg:row-start-1 sm:text-[0.8125rem]">
            <Sparkle className="size-3.5 flex-none opacity-80 max-sm:hidden" />
            {announcement?.link ? (
              <Link href={linkHref(announcement.link)} className="-my-1.5 inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-on-band">
                {text}
              </Link>
            ) : (
              <span>{text}</span>
            )}
          </p>
        ) : (
          <span className="lg:col-start-2" aria-hidden="true" />
        )}
        <div className="flex justify-end max-lg:col-start-2 max-lg:row-start-1">
          <LocaleSwitch variant="inline" />
        </div>
      </div>
    </div>
  );
}
