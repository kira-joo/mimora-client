import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { AddressesView } from "@/components/account/addresses-view";
import { getDeliveryZones, orNull } from "@/lib/catalog/reads";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "common" });
  return { title: t("addressesTitle"), robots: { index: false } };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  // Zones are catalog data (ISR, tagged). Without them the governorate is a free-text field, never a broken page.
  const zones = (await orNull(getDeliveryZones, "delivery zones")) ?? [];
  return (
    <div className="container-sf py-8 lg:py-12">
      <AddressesView zones={zones.map((zone) => ({ name: zone.name }))} />
    </div>
  );
}
