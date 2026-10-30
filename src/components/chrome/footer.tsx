import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatPhone, localized } from "@/lib/format/numerals";
import { linkHref } from "@/lib/links";
import type { ResolvedLink, StoreProfile } from "@/lib/api/types";
import type { Locale } from "@/i18n/routing";
import { resolveStoreLocales } from "@/i18n/store-locales";
import type { HoursView } from "@/lib/catalog/operating-hours";
import { CookieSettingsLink } from "./cookie-settings-link";
import { LocaleSwitch } from "./locale-switch";
import { NewsletterForm } from "./newsletter-form";
import { StoreHours } from "./store-hours";

/**
 * The merchant's footer navigation, the legal pages always (they cannot be
 * removed — legal-and-consent.md), and the store's own contact details and
 * social links — all data (MDS §17). Phone numbers stay Western and isolated
 * in both locales (D-10).
 */
export async function Footer({ profile, footerNavigation, legalLinks, hours }: { profile: StoreProfile; footerNavigation: ResolvedLink[]; legalLinks: ResolvedLink[]; hours: HoursView | null }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("common");
  const { phone, email, whatsApp } = profile.contact ?? {}; // a freshly seeded store may carry no contact block yet

  return (
    <footer className="mt-[var(--sf-section)] border-t border-line bg-surface-muted">
      <div className="container-sf grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <span className="font-display text-2xl font-semibold">{localized(profile.name, locale)}</span>
          {profile.tagline ? <p className="max-w-xs text-[0.9375rem] text-ink-secondary">{localized(profile.tagline, locale)}</p> : null}
          <address className="flex flex-col gap-1 not-italic">
            {phone ? (
              <a href={`tel:${phone.replace(/\s+/g, "")}`} className="inline-flex min-h-11 items-center text-ink-secondary hover:text-ink">
                <bdi dir="ltr" className="code">
                  {formatPhone(phone)}
                </bdi>
              </a>
            ) : null}
            {whatsApp ? (
              <a href={`https://wa.me/${whatsApp.replace(/[^\d]/g, "")}`} className="inline-flex min-h-11 items-center text-ink-secondary hover:text-ink" rel="noopener noreferrer" target="_blank">
                WhatsApp
              </a>
            ) : null}
            {email ? (
              <a href={`mailto:${email}`} className="inline-flex min-h-11 items-center text-ink-secondary hover:text-ink">
                <bdi dir="ltr">{email}</bdi>
              </a>
            ) : null}
          </address>
          {profile.socialLinks.length > 0 ? (
            <ul className="flex flex-wrap gap-x-4">
              {profile.socialLinks.map((social) => (
                <li key={social.url}>
                  <a href={social.url} rel="noopener noreferrer" target="_blank" className="inline-flex min-h-11 min-w-11 items-center justify-center text-[0.9375rem] capitalize text-ink-secondary hover:text-ink">
                    {social.platform}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {footerNavigation.length > 0 ? <FooterList title={t("footerShop")} links={footerNavigation} locale={locale} /> : null}
        <FooterList title={t("footerLegal")} links={legalLinks} locale={locale}>
          <li>
            <CookieSettingsLink />
          </li>
        </FooterList>
        <div className="flex flex-col gap-8">
          {/* Only when the merchant has published hours — an empty week is "not set", not "closed". */}
          {hours ? <StoreHours view={hours} variant="list" /> : null}
          <NewsletterForm />
          {/* A store serving one language has nothing to switch to — no heading over an empty control. */}
          {resolveStoreLocales(profile).supported.length > 1 ? (
            <div className="flex flex-col gap-3">
              <h3 className="t-heading">{t("language")}</h3>
              <div className="max-w-xs">
                <LocaleSwitch />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}

function FooterList({ title, links, locale, children }: { title: string; links: ResolvedLink[]; locale: Locale; children?: ReactNode }) {
  return (
    <nav aria-label={title} className="flex flex-col gap-3">
      <h3 className="t-heading">{title}</h3>
      <ul className="flex flex-col">
        {links.map((link) => (
          <li key={`${link.kind}-${link.slug}`}>
            <Link href={linkHref(link)} className="inline-flex min-h-11 items-center text-[0.9375rem] text-ink-secondary hover:text-ink">
              {localized(link.label, locale)}
            </Link>
          </li>
        ))}
        {children}
      </ul>
    </nav>
  );
}
