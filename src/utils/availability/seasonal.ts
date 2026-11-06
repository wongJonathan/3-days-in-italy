import { weekdayOf, type IsoDate } from "../hours/calendar.ts";

/**
 * A structured limit on when a Place can be visited, taken from its seasonal note.
 * Months are 1 (January) to 12 (December), inclusive; a range may wrap the new year.
 * - months:          open only in these months ("Open April-October only").
 * - nth-weekend:     open only on the nth Saturday of the month and the Sunday after it.
 * - hours-in-months: different opening hours in these months ("Summer hours extend to 19:30").
 */
export type SeasonalRule =
  | { kind: "months"; from: number; to: number }
  | { kind: "nth-weekend"; n: number }
  | { kind: "hours-in-months"; from: number; to: number; hours: string };

const SATURDAY = 6;
const SUNDAY = 0;

/** True when every rule allows a visit on this date. */
export const inSeason = (rules: SeasonalRule[], date: IsoDate): boolean =>
  rules.every((rule) => {
    switch (rule.kind) {
      case "months":
        return inMonths(rule.from, rule.to, date);
      case "nth-weekend":
        return onNthWeekend(rule.n, date);
      case "hours-in-months":
        return true; // changes the hours, not whether the Place is in season
    }
  });

/** The replacement hours for this date, or null to keep the Place's normal hours. */
export const seasonalHours = (
  rules: SeasonalRule[],
  date: IsoDate,
): string | null => {
  // The "r is HoursRule" part tells TypeScript the found rule has `hours`.
  const override = rules.find(
    (r): r is HoursRule =>
      r.kind === "hours-in-months" && inMonths(r.from, r.to, date),
  );
  return override?.hours ?? null;
};

type HoursRule = Extract<SeasonalRule, { kind: "hours-in-months" }>;

const inMonths = (from: number, to: number, date: IsoDate): boolean => {
  const month = Number(date.slice(5, 7));
  // A range like November-March wraps past December.
  return from <= to
    ? month >= from && month <= to
    : month >= from || month <= to;
};

/**
 * The nth Saturday falls on day (n-1)*7+1 to n*7 of the month.
 * A Sunday counts when the day before it was that Saturday.
 */
const onNthWeekend = (n: number, date: IsoDate): boolean => {
  const day = Number(date.slice(8, 10));
  const saturdayDay =
    weekdayOf(date) === SATURDAY
      ? day
      : weekdayOf(date) === SUNDAY
        ? day - 1
        : null;
  if (saturdayDay === null || saturdayDay < 1) return false;
  return Math.ceil(saturdayDay / 7) === n;
};
