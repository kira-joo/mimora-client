import { defineRouting } from "next-intl/routing";

export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * The one declaration of supported and default locales (MDS §3: Arabic is the
 * default, RTL primary). `localeDetection: false` — `/` is always Arabic rather
 * than negotiated from Accept-Language, so a cached page never varies by header.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: "ar",
  localeDetection: false,
});

export function isLocale(value: string | undefined): value is Locale {
  return value === "ar" || value === "en";
}

export function directionOf(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
