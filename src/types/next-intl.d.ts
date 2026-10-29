import type { routing } from "../i18n/routing";
import type common from "../i18n/locales/en/common.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: { common: typeof common };
  }
}
