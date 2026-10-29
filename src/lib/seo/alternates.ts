import "server-only";
import { alternateLanguages, resolveStoreLocales } from "@/i18n/store-locales";
import { getStoreProfile, orNull } from "@/lib/catalog/reads";

/**
 * hreflang alternates for a locale-less `path` ("" for home): one per locale the
 * STORE serves (plan #76), read from the cached store profile. An unreachable
 * profile resolves to every shipped locale (fail open, D-15).
 */
export async function storeAlternates(path: string): Promise<Record<string, string>> {
  const profile = await orNull(getStoreProfile, "store profile (alternates)");
  return alternateLanguages(path, resolveStoreLocales(profile));
}
