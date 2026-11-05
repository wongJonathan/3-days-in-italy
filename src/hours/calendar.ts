/** A calendar date as 'YYYY-MM-DD'. Dates carry no time and no time zone. */
export type IsoDate = string;

/**
 * 0 = Sunday … 6 = Saturday.
 */
export const weekdayOf = (date: IsoDate): number => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

const romeDateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const todayInRome = (now: Date): IsoDate => {
  const parts = Object.fromEntries(
    romeDateFormat.formatToParts(now).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};

/** The calendar date `days` after `date`. Done in UTC so time zones can't shift it. */
export const addDays = (date: IsoDate, days: number): IsoDate => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
};
