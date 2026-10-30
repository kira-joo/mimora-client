import type { CSSProperties } from "react";
import Image from "next/image";
import { Mail, Phone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatPhone, localized } from "@/lib/format/numerals";
import type { Category, ResolvedLink, StoreProfile } from "@/lib/api/types";
import type { Locale } from "@/i18n/routing";
import type { HoursView } from "@/lib/catalog/operating-hours";
import { exploreLinks, pageGroups, socialChannels, type FooterLink } from "@/lib/chrome/footer-links";
import { wordmark } from "@/lib/theme/brand-assets";
import { Bow, SolidHeart } from "@/components/home/ornaments";
import { FooterSection } from "./footer-section";
import { SocialIcon } from "./social-icon";
import { StoreHours } from "./store-hours";

const LINK = "inline-flex min-h-11 items-center text-[0.9375rem] text-ink-secondary underline-offset-4 transition-colors duration-[var(--sf-duration-fast)] hover:text-heading hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * Mimora's footer: a gingham ribbon tied with a bow along its top edge, the brand (wordmark, the store's own
 * description and tagline, contact details, social profiles and hours), then three link groups — Explore, Customer
 * care and Information — and the copyright line, centred at the foot. The newsletter is its own section just above
 * (newsletter-section.tsx); language switching lives in the header only.
 *
 * Every link is data the backend reports as existing (lib/chrome/footer-links.ts): published categories and pages
 * only, so the footer never links to a page that 404s, and the legal pages appear the moment they are published
 * (they cannot be removed — legal-and-consent.md). Contact details and social links come from the store profile;
 * a value that is not configured is not shown. Phone numbers stay Western and isolated in both locales (D-10).
 */
export async function Footer({ profile, footerNavigation, legalLinks, categories, hours }: { profile: StoreProfile; footerNavigation: ResolvedLink[]; legalLinks: ResolvedLink[]; categories: Category[]; hours: HoursView | null }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("common");
  const name = localized(profile.name, locale);
  const description = localized(profile.description, locale);
  const tagline = localized(profile.tagline, locale);
  const { phone, email } = profile.contact ?? {}; // a freshly seeded store may carry no contact block yet
  const socials = socialChannels(profile);
  const explore = exploreLinks(categories, footerNavigation);
  const { care, info } = pageGroups(legalLinks, footerNavigation);
  const groups = 1 + (care.length > 0 ? 1 : 0) + (info.length > 0 ? 1 : 0);

  return (
    <footer className="relative mt-(--sf-section) bg-panel">
      <div aria-hidden="true" className="gingham h-7 border-y border-line [--sf-gingham-size:var(--sf-gingham-ribbon)]" />
      <Bow className="pointer-events-none absolute left-1/2 top-0 w-24 -translate-x-1/2 lg:w-28" />

      <div className="container-sf pt-14 lg:pt-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2fr)] lg:gap-16">
          <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-start">
            <Link href="/" className="rounded-[var(--sf-radius-control)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">
              <Image src={wordmark} alt={name} sizes="180px" className="h-14 w-auto lg:h-16" />
            </Link>
            {description ? <p className="max-w-sm text-[0.9375rem] leading-relaxed text-ink-secondary">{description}</p> : null}
            {tagline ? (
              <p className="flex max-w-sm items-start gap-2 font-display text-[1.0625rem] text-heading">
                <SolidHeart className="mt-1.5 size-3.5 flex-none text-ornament" />
                <span>{tagline}</span>
              </p>
            ) : null}

            {phone || email ? (
              <address className="flex flex-wrap justify-center gap-x-5 not-italic lg:justify-start">
                {phone ? (
                  <a href={`tel:${phone.replace(/\s+/g, "")}`} className={`${LINK} gap-2`}>
                    <Phone className="size-4 text-ornament" aria-hidden="true" />
                    <bdi dir="ltr" className="code">
                      {formatPhone(phone)}
                    </bdi>
                  </a>
                ) : null}
                {email ? (
                  <a href={`mailto:${email}`} className={`${LINK} gap-2`}>
                    <Mail className="size-4 text-ornament" aria-hidden="true" />
                    <bdi dir="ltr">{email}</bdi>
                  </a>
                ) : null}
              </address>
            ) : null}

            {socials.length > 0 ? (
              <div className="flex flex-col items-center gap-3 lg:items-start">
                <h2 className="text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">{t("footerFollow")}</h2>
                <ul className="flex flex-wrap justify-center gap-2.5">
                  {socials.map((social) => (
                    <li key={social.url}>
                      <a
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t("footerSocial", { name: social.name })}
                        className="grid size-11 place-items-center rounded-full bg-surface text-heading shadow-card transition-colors duration-[var(--sf-duration-fast)] hover:bg-action hover:text-on-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      >
                        <SocialIcon platform={social.platform} className="size-5" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Only when the merchant has published hours — an empty week is "not set", not "closed". */}
            {hours ? (
              <div className="text-start">
                <StoreHours view={hours} variant="list" />
              </div>
            ) : null}
          </div>

          <div style={{ "--footer-groups": groups } as CSSProperties} className="border-t border-line lg:grid lg:grid-cols-[repeat(var(--footer-groups),minmax(0,1fr))] lg:gap-8 lg:border-0">
            <FooterSection title={t("footerExplore")}>
              <FooterItem href="/products" label={t("shopAll")} />
              <FooterLinks links={explore} locale={locale} />
            </FooterSection>
            {care.length > 0 ? (
              <FooterSection title={t("footerCare")}>
                <FooterLinks links={care} locale={locale} />
              </FooterSection>
            ) : null}
            {info.length > 0 ? (
              <FooterSection title={t("footerInfo")}>
                <FooterLinks links={info} locale={locale} />
              </FooterSection>
            ) : null}
          </div>
        </div>

      </div>

      <div className="container-sf mt-12 border-t border-line py-6 lg:mt-16">
        <p className="text-center text-[0.8125rem] text-ink-muted">{t("footerRights", { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}

function FooterLinks({ links, locale }: { links: FooterLink[]; locale: Locale }) {
  return links.map((link) => <FooterItem key={link.href} href={link.href} label={localized(link.label, locale)} />);
}

function FooterItem({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link href={href} className={LINK}>
        {label}
      </Link>
    </li>
  );
}
