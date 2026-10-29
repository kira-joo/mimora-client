import { ChevronDown, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import type { HoursRow, HoursView } from "@/lib/catalog/operating-hours";

/**
 * The store's opening hours. `list` is the footer's: the week, then any
 * upcoming date exceptions. `compact` is checkout's: one line saying how today
 * stands (closed days are said, not hidden), expanding to the same week.
 *
 * Presentational only: the view is resolved on the server in the STORE'S time
 * zone (lib/catalog/operating-hours.ts), so server and browser markup cannot
 * disagree about what "today" is. Times are wrapped in `bdi` — an Arabic line
 * mixing digits, a dash and AM/PM must not reorder itself.
 */
export function StoreHours({ view, variant }: { view: HoursView; variant: "list" | "compact" }) {
  const t = useTranslations("common");
  const week = <HoursList rows={view.weekly} />;
  const upcoming = view.exceptions.length > 0 ? (
    <div className="flex flex-col gap-1.5">
      <h4 className="text-[0.8125rem] font-semibold text-ink-secondary">{t("hoursUpcoming")}</h4>
      <HoursList rows={view.exceptions} />
    </div>
  ) : null;

  if (variant === "list") {
    return (
      <div className="flex flex-col gap-3">
        <h3 className="t-heading">{t("storeHours")}</h3>
        {week}
        {upcoming}
      </div>
    );
  }

  return (
    <details className="group border border-line-strong bg-surface">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 focus-visible:outline-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2.5">
          <Clock className="size-4 flex-none text-support" aria-hidden="true" />
          <span className="min-w-0 text-[0.9375rem]">
            <span className="font-medium">{t("storeHours")}</span>
            {view.today ? (
              <span className={cn("block text-[0.875rem]", view.today.closed ? "text-critical" : "text-ink-secondary")}>
                {t("hoursToday")}: <bdi>{view.today.text}</bdi>
              </span>
            ) : null}
          </span>
        </span>
        <ChevronDown className="size-4 flex-none transition-transform duration-[var(--sf-duration-standard)] group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="flex flex-col gap-4 border-t border-line px-4 py-4">
        {week}
        {upcoming}
      </div>
    </details>
  );
}

function HoursList({ rows }: { rows: HoursRow[] }) {
  const t = useTranslations("common");
  return (
    <dl className="flex flex-col gap-1 text-[0.9375rem]">
      {rows.map((row, index) => (
        <div key={`${index}-${row.day}`} className={cn("flex items-baseline justify-between gap-4", row.isToday && "font-semibold")}>
          <dt className="text-ink-secondary">
            {row.day}
            {row.isToday ? <span className="sr-only"> ({t("hoursToday")})</span> : null}
          </dt>
          <dd className={cn("tabular text-end", row.closed && "text-ink-muted")}>
            <bdi>{row.text}</bdi>
          </dd>
        </div>
      ))}
    </dl>
  );
}
