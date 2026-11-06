import { hasLocale, IntlErrorCode, type IntlError } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * UI CHROME only. Store content — product names, page copy, navigation labels —
 * is `Localized` data from the backend, rendered through `resolveLocalized`
 * (@kira-joo/toolkit-common, wrapped as `localized` in src/lib/format/numerals.ts). The two systems are never routed through each
 * other (mimora-client/CLAUDE.md).
 *
 * Adding a namespace: an entry here, `ar` and `en` files under ./locales, and
 * nothing else — the parity test (messages.test.ts) fails if one side lacks a key.
 */
const NAMESPACES = ["common"] as const;

async function loadMessages(locale: string) {
  const entries = await Promise.all(NAMESPACES.map(async (namespace) => [namespace, (await import(`./locales/${locale}/${namespace}.json`)).default] as const));
  return Object.fromEntries(entries);
}

/** A missing key renders visibly as `[missing: …]` and is logged — never blank, never the other locale. */
function onError(error: IntlError) {
  if (error.code === IntlErrorCode.MISSING_MESSAGE) {
    if (process.env.NODE_ENV === "development") console.error(error);
    else console.warn(error.message);
    return;
  }
  console.error(error);
}

function getMessageFallback({ namespace, key }: { namespace?: string; key: string }) {
  return `[missing: ${namespace ? `${namespace}.${key}` : key}]`;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, messages: await loadMessages(locale), onError, getMessageFallback };
});
