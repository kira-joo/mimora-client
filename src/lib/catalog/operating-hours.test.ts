import { describe, expect, it } from "vitest";
import type { OperatingHours } from "@/lib/api/types";
import { buildHoursView, zonedToday } from "./operating-hours";

// 2026-10-23 is a Friday (weekday 5).
const hours: OperatingHours = {
  weekly: [
    { weekday: 0, ranges: [{ open: "10:00", close: "18:00" }] },
    { weekday: 1, ranges: [{ open: "09:00", close: "13:00" }, { open: "16:00", close: "21:00" }] },
    { weekday: 5, ranges: [] },
    { weekday: 6, ranges: [{ open: "10:00", close: "16:00" }] },
  ],
  exceptions: [
    { date: "2026-12-25T00:00:00.000Z", closed: true, ranges: [] },
    { date: "2026-10-23T00:00:00.000Z", closed: false, ranges: [{ open: "12:00", close: "14:00" }] },
    { date: "2026-09-01T00:00:00.000Z", closed: true, ranges: [] },
  ],
};
const NOW = new Date("2026-10-23T09:30:00Z");
const base = { locale: "en" as const, timeZone: "Africa/Cairo", now: NOW, closedLabel: "Closed", showToday: true };

describe("zonedToday", () => {
  it("resolves the date and weekday in the STORE'S zone, not UTC", () => {
    // 23:30 UTC on Friday is already Saturday 02:30 in Cairo (UTC+3 in October 2026 DST... or +2): either way, past midnight.
    const lateFriday = new Date("2026-10-23T22:30:00Z");
    expect(zonedToday(lateFriday, "Africa/Cairo")).toEqual({ date: "2026-10-24", weekday: 6 });
    expect(zonedToday(lateFriday, "UTC")).toEqual({ date: "2026-10-23", weekday: 5 });
  });
});

describe("buildHoursView", () => {
  it("is null when hours are not published — an empty week is 'not set', never 'closed every day'", () => {
    expect(buildHoursView({ weekly: [], exceptions: [] }, base)).toBeNull();
    expect(buildHoursView(null, base)).toBeNull();
  });

  it("lists all seven days, a day with no entry or no ranges as closed", () => {
    const view = buildHoursView(hours, base)!;
    expect(view.weekly).toHaveLength(7);
    const byDay = Object.fromEntries(view.weekly.map((row) => [row.day, row]));
    expect(byDay.Sunday).toMatchObject({ text: "10:00 AM – 6:00 PM", closed: false });
    expect(byDay.Tuesday).toMatchObject({ text: "Closed", closed: true });
    expect(byDay.Friday).toMatchObject({ text: "Closed", closed: true });
  });

  it("joins split shifts", () => {
    const monday = buildHoursView(hours, base)!.weekly.find((row) => row.day === "Monday");
    expect(monday?.text).toBe("9:00 AM – 1:00 PM, 4:00 PM – 9:00 PM");
  });

  it("starts the week on Sunday in English and Saturday in Arabic", () => {
    expect(buildHoursView(hours, base)!.weekly[0]?.day).toBe("Sunday");
    const ar = buildHoursView(hours, { ...base, locale: "ar" })!;
    expect(ar.weekly).toHaveLength(7);
    expect(ar.weekly[0]?.text).toContain("١٠"); // Saturday 10:00 in Arabic-Indic numerals
  });

  it("today's exception REPLACES the weekly hours for that date", () => {
    const view = buildHoursView(hours, base)!;
    expect(view.today).toMatchObject({ closed: false, isToday: true, text: "12:00 PM – 2:00 PM" });
  });

  it("with no exception, today is the weekly entry for today's weekday", () => {
    const noException = { ...hours, exceptions: [] };
    expect(buildHoursView(noException, base)!.today).toMatchObject({ day: "Friday", text: "Closed", closed: true });
  });

  it("marks today in the weekly list", () => {
    const view = buildHoursView(hours, base)!;
    expect(view.weekly.filter((row) => row.isToday).map((row) => row.day)).toEqual(["Friday"]);
  });

  it("shows no 'today' at all when asked not to (a statically rendered footer)", () => {
    const view = buildHoursView(hours, { ...base, showToday: false })!;
    expect(view.today).toBeNull();
    expect(view.weekly.some((row) => row.isToday)).toBe(false);
    expect(view.exceptions.some((row) => row.isToday)).toBe(false);
  });

  it("lists only upcoming exceptions, soonest first — a past one is gone", () => {
    const view = buildHoursView(hours, base)!;
    expect(view.exceptions).toHaveLength(2);
    expect(view.exceptions[0]).toMatchObject({ isToday: true });
    expect(view.exceptions[1]).toMatchObject({ closed: true, text: "Closed" });
    expect(view.exceptions.map((row) => row.day).join()).not.toContain("Sep");
  });

  it("caps the exceptions it lists", () => {
    const many: OperatingHours = { weekly: hours.weekly, exceptions: Array.from({ length: 12 }, (_, index) => ({ date: `2027-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`, closed: true, ranges: [] })) };
    expect(buildHoursView(many, base)!.exceptions).toHaveLength(5);
    expect(buildHoursView(many, { ...base, maxExceptions: 3 })!.exceptions).toHaveLength(3);
  });

  it("shows an unparseable time as stored rather than dropping it", () => {
    const odd: OperatingHours = { weekly: [{ weekday: 0, ranges: [{ open: "dawn", close: "18:00" }] }], exceptions: [] };
    expect(buildHoursView(odd, base)!.weekly.find((row) => row.day === "Sunday")?.text).toBe("dawn – 6:00 PM");
  });
});
