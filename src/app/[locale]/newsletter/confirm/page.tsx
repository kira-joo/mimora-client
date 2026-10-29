import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { AuthShell } from "@/components/auth/auth-shell";
import { NewsletterConfirmStatus } from "@/components/chrome/newsletter-confirm-status";

/** Dynamic and never indexed: the token is in the URL, so the page also sends no referrer (MDS §5, like verify-email). */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "common.newsletterConfirm" });
  return { title: t("title"), robots: { index: false }, referrer: "no-referrer" };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("common.newsletterConfirm");
  return (
    <AuthShell title={t("title")}>
      <Suspense>
        <NewsletterConfirmStatus />
      </Suspense>
    </AuthShell>
  );
}
