"use client";

import { Globe } from "lucide-react";
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
 *
 * `block` is the full-width button (menu drawer, footer); `inline` is the compact
 * globe-and-name control on the announcement band.
 */
export function LocaleSwitch({ variant = "block" }: { variant?: "block" | "inline" }) {
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
        <button
          key={other}
          type="button"
          lang={other}
          className={variant === "inline" ? "-my-0.5 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-semibold text-on-band transition-colors duration-[var(--sf-duration-fast)] hover:bg-on-band/15 focus-visible:outline-on-band" : "btn btn-secondary w-full"}
          onClick={() => router.replace(`${pathname}${window.location.search}`, { locale: other })}
        >
          {variant === "inline" ? <Globe className="size-4" aria-hidden="true" /> : null}
          {t("switchLanguage")}
        </button>
      ))}
    </>
  );
}
