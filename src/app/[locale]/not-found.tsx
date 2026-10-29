import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** A designed "not here" (MDS §15): say so, and offer the way back into the store. */
export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="container-sf flex min-h-[50dvh] flex-col items-start justify-center gap-4 py-16">
      <h1 className="t-title">{t("notFoundTitle")}</h1>
      <p className="max-w-md text-ink-secondary">{t("notFoundBody")}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/products" className="btn btn-primary">
          {t("shopAll")}
        </Link>
        <Link href="/" className="btn btn-secondary">
          {t("backToShop")}
        </Link>
      </div>
    </div>
  );
}
