/**
 * One opening window, in minutes after midnight, Rome wall-clock time.
 * `close` may exceed 1440 when a Place stays open past midnight
 * ("8:00-01:00" → { open: 480, close: 1500 }); the window belongs to the day it opens.
 */
export type OpenRange = { open: number; close: number };

/** Index 0 = Sunday … 6 = Saturday, matching Date#getUTCDay. An empty list means closed that day. */
export type WeekHours = OpenRange[][];

/** Phrases that describe a time of day without real hours. Step 3 turns these into Assumed hours. */
export type VaguePhrase = "evenings" | "morning-only";

export type ParsedHours =
  | { kind: "weekly"; week: WeekHours }
  | { kind: "vague"; phrase: VaguePhrase }
  | { kind: "missing" }
  | { kind: "unrecognized"; raw: string };

const DAY = 24 * 60;
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const DAY_NAMES: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  tues: 2,
  wed: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  fri: 5,
  sat: 6,
};

const VAGUE_PHRASES: Record<string, VaguePhrase> = {
  evenings: "evenings",
  "morning only": "morning-only",
};

/**
 * Turns a raw `hours` string from the dataset into a weekly table.
 *
 * Grammar, by example:
 *   "9:00-19:00"                         every day
 *   "8am-7pm", "9am-12:30pm"             12-hour clock
 *   "12:00-14:30, 19:00-22:30"           split hours
 *   "Mon-Sat 10:00-18:00"                days not listed are closed
 *   "Wed-Mon 10:00-18:00"                day ranges can wrap past Sunday
 *   "Mon-Fri 7:00-14:00, Sat 7:00-17:00" several day groups
 *   "Tues, Thurs-Sun 10:00-18:00"        a bare day joins the next group
 */
export const parseHours = (raw: string | null): ParsedHours => {
  if (raw === null) return { kind: "missing" };

  const vague = VAGUE_PHRASES[raw.trim().toLowerCase()];
  if (vague) return { kind: "vague", phrase: vague };

  const week = parseWeek(raw);
  return week ? { kind: "weekly", week } : { kind: "unrecognized", raw };
};

const parseWeek = (raw: string): WeekHours | null => {
  const week: WeekHours = ALL_DAYS.map(() => []);
  let pendingDays: number[] = []; // bare days ("Tues,") waiting for the next part's hours
  let currentDays: number[] | null = null; // the days that a part with no day prefix applies to
  let rangeCount = 0;

  for (const part of raw.split(",").map((p) => p.trim())) {
    let rangeText = part;
    const dayMatch = /^([a-z]+(?:-[a-z]+)?)(?:\s+(.+))?$/i.exec(part);

    if (dayMatch) {
      const days = parseDays(dayMatch[1]);
      if (!days) return null;
      if (!dayMatch[2]) {
        pendingDays.push(...days);
        continue;
      }
      currentDays = [...pendingDays, ...days];
      pendingDays = [];
      rangeText = dayMatch[2];
    } else if (pendingDays.length > 0) {
      currentDays = pendingDays;
      pendingDays = [];
    }

    const range = parseRange(rangeText);
    if (!range) return null;
    (currentDays ?? ALL_DAYS).forEach((day) => week[day].push(range));
    rangeCount++;
  }

  return pendingDays.length === 0 && rangeCount > 0 ? week : null;
};

const parseDays = (text: string): number[] | null => {
  const lower = text.toLowerCase();
  if (lower === "daily") return ALL_DAYS;

  const [from, to = from] = lower.split("-").map((name) => DAY_NAMES[name]);
  if (from === undefined || to === undefined) return null;

  const days = [from];
  for (let d = from; d !== to;) {
    d = (d + 1) % 7;
    days.push(d);
  }
  return days;
};

const parseRange = (text: string): OpenRange | null => {
  const ends = text.split("-");
  if (ends.length !== 2) return null;

  const open = parseTime(ends[0]);
  const close = parseTime(ends[1]);
  if (open === null || close === null || open >= DAY || open === close)
    return null;

  return { open, close: close < open ? close + DAY : close };
};

const parseTime = (text: string): number | null => {
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(text.trim());
  if (!match) return null;

  const [, hourText, minuteText, meridiem] = match;
  let hour = Number(hourText);
  const minute = minuteText === undefined ? 0 : Number(minuteText);
  if (minute > 59) return null;

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (meridiem.toLowerCase() === "pm" ? 12 : 0);
  } else {
    // 24-hour times must have minutes ("9:00"), so a bare "9" is never misread.
    if (minuteText === undefined || hour > 24 || (hour === 24 && minute > 0))
      return null;
  }

  return hour * 60 + minute;
};
