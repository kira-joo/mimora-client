"use client";

import { useLocale, useTranslations } from "next-intl";
import { useStore } from "@/components/providers/store-context";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALES, type Locale } from "@/i18n/routing";

/**
 * Switches language on the same page, keeping the query so filters survive.
 * The query is read at click time rather than with `useSearchParams`, which
 * would turn this layout component into a client-rendered boundary on every
 * statically generated page.
 *
 * Offers only locales the STORE serves (profile `supportedLocales`, via the
 * store context); a store serving one language shows no switch at all.
 */
export function LocaleSwitch() {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const { supportedLocales } = useStore();
  const served = supportedLocales ?? LOCALES;
  const others = LOCALES.filter((candidate) => candidate !== locale && served.includes(candidate));
  if (others.length === 0) return null;

  return (
    <>
      {others.map((other: Locale) => (
        <button key={other} type="button" lang={other} className="btn btn-secondary w-full" onClick={() => router.replace(`${pathname}${window.location.search}`, { locale: other })}>
          {t("switchLanguage")}
        </button>
      ))}
    </>
  );
}
