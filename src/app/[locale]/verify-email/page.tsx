import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailStatus } from "@/components/auth/token-forms";

/** Auth screens are dynamic and never indexed (MDS §5). */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "common" });
  return { title: t("verifyTitle"), robots: { index: false }, referrer: "no-referrer" };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("common");
  return (
    <AuthShell title={t("verifyTitle")}>
      <Suspense><VerifyEmailStatus /></Suspense>
    </AuthShell>
  );
}
