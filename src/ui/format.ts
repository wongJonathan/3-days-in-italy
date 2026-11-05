import type { IsoDate } from "../hours/calendar.ts";

/**
 * Reads parts of a calendar date. Formats in UTC because an IsoDate has no
 * time zone: using the browser's zone could show the day before.
 * en-US gives "Sep" (en-GB gives "Sept") and "Fri".
 */
const partsOf = (
  date: IsoDate,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> => {
  const [year, month, day] = date.split("-").map(Number);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    ...options,
  });
  return Object.fromEntries(
    formatter
      .formatToParts(new Date(Date.UTC(year, month - 1, day)))
      .map((p) => [p.type, p.value]),
  );
};

/** "2026-11-06" → "Fri 6 Nov". */
export const formatDate = (date: IsoDate): string => {
  const p = partsOf(date, { weekday: "short", day: "numeric", month: "short" });
  return `${p.weekday} ${p.day} ${p.month}`;
};

/** "2026-11-08" → "Sunday". */
export const formatWeekday = (date: IsoDate): string =>
  partsOf(date, { weekday: "long" }).weekday;

/** "2026-11-08" → "November". */
export const formatMonth = (date: IsoDate): string =>
  partsOf(date, { month: "long" }).month;

/** 570 → "09:30". Past midnight wraps: 1500 → "01:00". */
export const formatTime = (minutes: number): string => {
  const inDay = minutes % (24 * 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(inDay / 60))}:${pad(inDay % 60)}`;
};
