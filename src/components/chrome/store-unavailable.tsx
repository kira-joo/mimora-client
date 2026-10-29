import { getTranslations } from "next-intl/server";

/**
 * The store's configuration could not be read (backend unreachable, or the
 * merchant has not set the store up yet). A designed state, not a crash — and
 * not cached for long: the catalog safety-net revalidation re-renders it from
 * real data (D-15).
 */
export async function StoreUnavailable() {
  const t = await getTranslations("common");
  return (
    <main id="main" className="container-sf flex min-h-[70dvh] flex-col items-center justify-center gap-3 text-center">
      <h1 className="t-title">{t("unavailableTitle")}</h1>
      <p className="max-w-md text-ink-secondary">{t("unavailableBody")}</p>
    </main>
  );
}
