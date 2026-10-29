import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import "../../styles/globals.css";
import { directionOf, isLocale, routing, type Locale } from "@/i18n/routing";
import { getContent, getOperatingHours, getStoreProfile, getTheme, orNull } from "@/lib/catalog/reads";
import { buildHoursView } from "@/lib/catalog/operating-hours";
import { JsonLd } from "@/components/seo/json-ld";
import { storeJsonLd } from "@/lib/seo/structured-data";
import { localized } from "@/lib/format/numerals";
import { brandCss, htmlThemeAttributes } from "@/lib/theme/theme";
import { groundScript } from "@/lib/theme/ground-script";
import { fontVariables } from "@/lib/theme/fonts";
import { siteOrigin } from "@/lib/config/site-origin";
import { alternateLanguages, resolveStoreLocales } from "@/i18n/store-locales";
import { AppProviders } from "@/components/providers/app-providers";
import { AnnouncementBar } from "@/components/chrome/announcement-bar";
import { Header } from "@/components/chrome/header";
import { Footer } from "@/components/chrome/footer";
import { AddedSheet } from "@/components/cart/added-sheet";
import { CookieNotice } from "@/components/chrome/cookie-notice";
import { StoreUnavailable } from "@/components/chrome/store-unavailable";
import { storeTimeZone } from "@/lib/config/startup-check";

/*
 * The production storefront's root layout — a separate route tree from the
 * design preview (`app/preview/**`), which has its own root layout and is never
 * imported here.
 *
 * Static per locale (ISR): it reads only cache-tagged store configuration and
 * nothing about the visitor. The ground follows the system preference in CSS;
 * only an explicit stored choice runs a script (MDS §19). No Server Component
 * branches on theme.
 *
 * D-15: an unreachable backend degrades this to the designed "unavailable"
 * state instead of failing the build; the safety-net revalidation re-renders it
 * from real data.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const profile = await orNull(getStoreProfile, "store profile (metadata)");
  if (!profile) return { robots: { index: false } };
  const name = localized(profile.name, locale);
  const origin = siteOrigin();
  return {
    // Absolute URLs for Open Graph images and alternates come from this deployment's own origin (SITE_URL).
    ...(origin ? { metadataBase: new URL(origin) } : {}),
    title: { default: localized(profile.defaultSeo?.title, locale) || name, template: `%s · ${name}` },
    description: localized(profile.defaultSeo?.description, locale) || localized(profile.tagline, locale),
    icons: profile.favicon?.secureUrl ? [{ url: profile.favicon.secureUrl }] : undefined,
    openGraph: { siteName: name, locale: locale === "ar" ? "ar_EG" : "en_US", images: profile.ogImage?.secureUrl ? [profile.ogImage.secureUrl] : undefined },
    alternates: { languages: alternateLanguages("", resolveStoreLocales(profile)) },
  };
}

export async function generateViewport(): Promise<Viewport> {
  return { width: "device-width", initialScale: 1 };
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  setRequestLocale(locale);

  const [profile, theme, content, operatingHours, messages, t] = await Promise.all([
    orNull(getStoreProfile, "store profile"),
    orNull(getTheme, "theme"),
    orNull(getContent, "storefront content"),
    orNull(getOperatingHours, "operating hours"),
    getMessages(),
    getTranslations({ locale, namespace: "common" }),
  ]);

  const css = brandCss(theme);
  // The footer is part of a statically rendered layout, so it carries the week and the upcoming exceptions but no
  // "today" (which would go stale); checkout, which is dynamic, says how today stands.
  const hours = buildHoursView(operatingHours, { locale, timeZone: storeTimeZone(), now: new Date(), closedLabel: t("hoursClosed"), showToday: false });
  const allowVisitorGround = Boolean(theme?.theme.darkEnabled && theme.theme.allowVisitorChoice);

  return (
    <html lang={locale} dir={directionOf(locale)} className={fontVariables} {...htmlThemeAttributes(theme)} suppressHydrationWarning>
      <head>
        {/* A literal string from a plain module — see lib/theme/ground-script.ts for why that matters. */}
        {allowVisitorGround ? <script dangerouslySetInnerHTML={{ __html: groundScript }} /> : null}
        {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:bg-canvas focus:px-4 focus:py-2">
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {profile ? (
            <AppProviders store={{ currency: profile.currency, timeZone: storeTimeZone(), storeName: profile.name, allowVisitorGround, supportedLocales: resolveStoreLocales(profile).supported }}>
              <JsonLd
                data={storeJsonLd({
                  origin: siteOrigin(),
                  locale,
                  name: localized(profile.name, locale),
                  description: localized(profile.description, locale) || localized(profile.tagline, locale) || undefined,
                  logoUrl: profile.logo?.secureUrl,
                  imageUrl: profile.ogImage?.secureUrl,
                  phone: profile.contact.phone,
                  email: profile.contact.email,
                  socialUrls: profile.socialLinks.map((social) => social.url),
                  currency: profile.currency,
                })}
              />
              {/* First in the tree so a first-time visitor reaches the choice in a few Tab presses, not after the whole page; the panel is fixed to the viewport foot, so its position on screen is unchanged. */}
              <CookieNotice />
              <AnnouncementBar announcement={content?.announcement ?? null} />
              <Header storeName={localized(profile.name, locale)} logo={profile.logo ?? null} navigation={content?.headerNavigation ?? []} />
              <main id="main">{children}</main>
              <Footer profile={profile} footerNavigation={content?.footerNavigation ?? []} legalLinks={content?.legalLinks ?? []} hours={hours} />
              <AddedSheet />
            </AppProviders>
          ) : (
            <StoreUnavailable />
          )}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
