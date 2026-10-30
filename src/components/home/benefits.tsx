import { RotateCcw, Truck, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { storeAssurances } from "@/lib/catalog/assurances";
import type { DeliveryZone, FulfilmentSettings, PaymentMethodView } from "@/lib/api/types";

/** What the store promises, from its own settings (lib/catalog/assurances.ts) — a promise with no data behind it is simply absent. */
export async function benefitItems(locale: Locale, fulfilment: FulfilmentSettings | null, zones: DeliveryZone[], paymentMethods: PaymentMethodView[]) {
  const t = await getTranslations("common");
  const facts = storeAssurances(locale, t, fulfilment, zones, paymentMethods);
  return [
    facts.delivery ? { icon: Truck, body: facts.delivery } : null,
    facts.returns ? { icon: RotateCcw, body: facts.returns } : null,
    facts.payment ? { icon: Wallet, body: facts.payment } : null,
  ].filter((item) => item !== null);
}

export type BenefitItem = Awaited<ReturnType<typeof benefitItems>>[number];

/**
 * The assurance strip as icon + label items: stacked and centred on a phone, icon beside text on desktop. Plain
 * information — no links, nothing to tab to.
 */
export function Benefits({ items, className }: { items: BenefitItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={`grid items-start gap-x-3 gap-y-4 ${items.length >= 3 ? "grid-cols-3" : "grid-cols-2"} ${className ?? ""}`}>
      {items.map(({ icon: Icon, body }) => (
        <li key={body} className="flex flex-col items-center gap-1.5 text-center lg:flex-row lg:items-center lg:gap-3 lg:text-start">
          <Icon className="size-7 flex-none stroke-[1.5] text-ornament lg:size-8" aria-hidden="true" />
          <p className="min-w-0 text-[0.8125rem] font-medium leading-snug text-ink-secondary lg:text-[0.875rem]">{body}</p>
        </li>
      ))}
    </ul>
  );
}
