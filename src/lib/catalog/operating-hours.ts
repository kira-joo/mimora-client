import type { Locale } from "@/i18n/routing";
import type { OperatingHours } from "@/lib/api/types";
import { formatDate } from "@/lib/format/numerals";

/*
 * The store's weekly hours and date exceptions, as a view model (plan #39).
 * The backend's convention is `weekday` 0-6 = Sunday-Saturday and an exception
 * is a calendar date that REPLACES that day's weekly hours. Everything here is
 * resolved in the STORE'S time zone — a visitor's own clock says nothing about
 * whether the store is open — and an empty weekly list means "hours not
 * published", which renders as nothing rather than as "closed every day".
 */
type Ranges = Array<{ open: string; close: string }>;

export interface HoursRow {
  /** "Saturday" / "Thu, 25 Dec" — localized. */
  day: string;
  /** "9:00 AM – 5:00 PM", ranges joined; the closed label when there are none. */
  text: string;
  closed: boolean;
  isToday: boolean;
}

export interface HoursView {
  /** Today's hours; null when the caller asked for no "today" (a statically-rendered footer has no honest today). */
  today: HoursRow | null;
  weekly: HoursRow[];
  /** Upcoming exceptions only (today onward), soonest first. */
  exceptions: HoursRow[];
}

/** Which weekday a week starts on in each locale — presentation only (Egypt starts on Saturday). */
const WEEK_STARTS_ON: Record<Locale, number> = { ar: 6, en: 0 };
const TIME = /^(\d{1,2}):(\d{2})$/;

/** The store-zone calendar date ("2026-10-23") and weekday (0 = Sunday) of an instant. */
export function zonedToday(now: Date, timeZone: string): { date: string; weekday: number } {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return { date, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
}

function timeOfDay(locale: Locale, value: string): string {
  const match = TIME.exec(value.trim());
  if (!match) return value;
  return formatDate(locale, `2000-01-01T${match[1]!.padStart(2, "0")}:${match[2]}:00Z`, "UTC", { hour: "numeric", minute: "2-digit" });
}

function rangesText(locale: Locale, ranges: Ranges, closedLabel: string): { text: string; closed: boolean } {
  if (ranges.length === 0) return { text: closedLabel, closed: true };
  return { text: ranges.map((range) => `${timeOfDay(locale, range.open)} – ${timeOfDay(locale, range.close)}`).join(locale === "ar" ? "، " : ", "), closed: false };
}

const weekdayName = (locale: Locale, weekday: number) => formatDate(locale, `2023-01-0${1 + weekday}T00:00:00Z`, "UTC", { weekday: "long" });
const dateLabel = (locale: Locale, date: string) => formatDate(locale, `${date}T00:00:00Z`, "UTC", { weekday: "short", day: "numeric", month: "short" });

export function buildHoursView(hours: OperatingHours | null | undefined, options: { locale: Locale; timeZone: string; now: Date; closedLabel: string; showToday: boolean; maxExceptions?: number }): HoursView | null {
  if (!hours || hours.weekly.length === 0) return null;
  const { locale, timeZone, now, closedLabel, showToday } = options;
  const today = zonedToday(now, timeZone);
  const asRow = (day: string, ranges: Ranges, closed: boolean, isToday: boolean): HoursRow => {
    const text = closed ? { text: closedLabel, closed: true } : rangesText(locale, ranges, closedLabel);
    return { day, text: text.text, closed: text.closed, isToday };
  };

  const exceptionFor = (date: string) => hours.exceptions.find((exception) => exception.date.slice(0, 10) === date);
  const weekly = Array.from({ length: 7 }, (_, offset) => (WEEK_STARTS_ON[locale] + offset) % 7).map((weekday) => {
    const entry = hours.weekly.find((candidate) => candidate.weekday === weekday);
    return asRow(weekdayName(locale, weekday), entry?.ranges ?? [], false, showToday && weekday === today.weekday);
  });

  const todayException = exceptionFor(today.date);
  const todayWeekly = hours.weekly.find((candidate) => candidate.weekday === today.weekday);
  const todayRow = showToday ? (todayException ? asRow(dateLabel(locale, today.date), todayException.ranges, todayException.closed, true) : asRow(weekdayName(locale, today.weekday), todayWeekly?.ranges ?? [], false, true)) : null;

  const exceptions = hours.exceptions
    .map((exception) => ({ date: exception.date.slice(0, 10), exception }))
    .filter(({ date }) => date >= today.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, options.maxExceptions ?? 5)
    .map(({ date, exception }) => asRow(dateLabel(locale, date), exception.ranges, exception.closed, showToday && date === today.date));

  return { today: todayRow, weekly, exceptions };
}
