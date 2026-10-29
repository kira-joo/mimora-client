import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { getStoreProfile, orNull } from "@/lib/catalog/reads";
import { formatPhone } from "@/lib/format/numerals";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "common" });
  return { title: t("forgotTitle"), robots: { index: false } };
}

/**
 * Password recovery, honestly (D-8, MDS §6.10). There is no email or SMS
 * provider, and the backend hashes and discards a self-service reset token —
 * so a "we've sent you a link" screen would be a lie. Until a provider exists,
 * the store sends the reset link by hand; this page says so and gives the
 * store's own contact details (data, never constants).
 */
export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  setRequestLocale(locale);
  const t = await getTranslations("common");
  const profile = await orNull(getStoreProfile, "store profile");
  const { phone, whatsApp, email } = profile?.contact ?? {};
  return (
    <AuthShell title={t("forgotTitle")} intro={t("forgotBody")}>
      <div className="flex flex-col gap-3">
        <h2 className="font-semibold">{t("contactStore")}</h2>
        {phone ? (
          <a href={`tel:${phone.replace(/\s+/g, "")}`} className="btn btn-secondary justify-start">
            <bdi dir="ltr">{formatPhone(phone)}</bdi>
          </a>
        ) : null}
        {whatsApp ? (
          <a href={`https://wa.me/${whatsApp.replace(/[^\d]/g, "")}`} className="btn btn-secondary justify-start" rel="noopener noreferrer" target="_blank">
            WhatsApp
          </a>
        ) : null}
        {email ? (
          <a href={`mailto:${email}`} className="btn btn-secondary justify-start">
            <bdi dir="ltr">{email}</bdi>
          </a>
        ) : null}
        <Link href="/login" className="mt-2 inline-flex min-h-11 items-center text-[0.9375rem] underline underline-offset-4">
          {t("signIn")}
        </Link>
      </div>
    </AuthShell>
  );
}
