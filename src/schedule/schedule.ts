import {
  availabilityOn,
  type DayAvailability,
} from "../availability/availability.ts";
import type { SeasonalRule } from "../availability/seasonal.ts";
import type { CleanPlace } from "../data/place.ts";
import type { IsoDate } from "../hours/calendar.ts";
import type { OpenRange } from "../hours/parse.ts";
import {
  travelTime,
  type TransportMode,
  type TravelTime,
} from "../travel/travel-time.ts";

/** The hours a Trip Day runs, in minutes after midnight. */
export type DayWindow = { start: number; end: number };

/** 09:00–22:30, the default Day Window. */
export const DEFAULT_DAY_WINDOW: DayWindow = {
  start: 9 * 60,
  end: 22 * 60 + 30,
};

/** Travel from the previous Stop longer than this gets a Warning. */
export const LONG_TRAVEL_MINUTES = 60;

/** Used when a Place has no duration. */
export const DEFAULT_VISIT_MINUTES = 60;

export type SchedulablePlace = Pick<
  CleanPlace,
  | "id"
  | "latitude"
  | "longitude"
  | "city"
  | "hours"
  | "hours_status"
  | "duration_minutes"
>;

/**
 * One Stop to schedule: the Place and its Seasonal Rules.
 * `notBefore` holds the visit until a time of day (e.g. dinner from 19:00).
 */
export type StopInput = {
  place: SchedulablePlace;
  rules: SeasonalRule[];
  notBefore?: number;
};

/** A broken planner rule. Warnings never stop the traveler from keeping a Stop. */
export type Warning =
  | { kind: "closed"; reason: "weekday" | "season" }
  | { kind: "closed-on-arrival"; arrivesAt: number; closedAt: number }
  | { kind: "past-closing"; endsAt: number; closesAt: number }
  | {
      kind: "long-travel";
      minutes: number;
      reason: "over-limit" | "longer-than-visit";
    }
  | { kind: "past-day-window"; endsAt: number; windowEnd: number };

export type ScheduledStop = {
  placeId: string;
  /** Travel from the previous Stop; null for the first Stop. */
  travel: TravelTime | null;
  /** When the traveler gets there. */
  arrive: number;
  /** When the visit starts: later than `arrive` if the Place opens later. */
  start: number;
  end: number;
  availability: DayAvailability;
  warnings: Warning[];
};

export type ScheduledDay = {
  stops: ScheduledStop[];
  /** When the last visit ends (the window start for an empty day). */
  endsAt: number;
  warningCount: number;
};

export type DayPlan = {
  date: IsoDate;
  window: DayWindow;
  mode: TransportMode;
  stops: StopInput[];
};

/**
 * Turns an ordered list of Stops into a timed day with Warnings.
 * Pure: the same plan always gives the same schedule, so the UI can
 * simply re-run it after every reorder, add or remove.
 */
export const scheduleDay = ({
  date,
  window,
  mode,
  stops,
}: DayPlan): ScheduledDay => {
  const scheduled: ScheduledStop[] = [];
  let clock = window.start;
  let previous: SchedulablePlace | null = null;

  for (const { place, rules, notBefore } of stops) {
    const travel = previous ? travelTime(previous, place, mode) : null;
    const arrive = clock + (travel?.minutes ?? 0);
    const visitMinutes = place.duration_minutes ?? DEFAULT_VISIT_MINUTES;
    const availability = availabilityOn(place, rules, date);
    const start = visitStart(availability, Math.max(arrive, notBefore ?? 0));
    const end = start + visitMinutes;

    scheduled.push({
      placeId: place.id,
      travel,
      arrive,
      start,
      end,
      availability,
      warnings: [
        ...travelWarnings(travel, visitMinutes),
        ...hoursWarnings(availability, arrive, start, end),
      ],
    });
    clock = end;
    previous = place;
  }

  const last = scheduled.at(-1);
  if (last && last.end > window.end) {
    last.warnings.push({
      kind: "past-day-window",
      endsAt: last.end,
      windowEnd: window.end,
    });
  }

  return {
    stops: scheduled,
    endsAt: last?.end ?? window.start,
    warningCount: scheduled.reduce((sum, s) => sum + s.warnings.length, 0),
  };
};

/** Opening windows in time order. */
const openRanges = (availability: DayAvailability): OpenRange[] =>
  availability.kind === "open"
    ? [...availability.ranges].sort((a, b) => a.open - b.open)
    : [];

/**
 * If the Place opens later today, wait for it. Otherwise (open now, closed,
 * already shut for the day, or unknown hours) start on arrival.
 */
const visitStart = (availability: DayAvailability, arrive: number): number => {
  const next = openRanges(availability).find((r) => r.close > arrive);
  return next ? Math.max(arrive, next.open) : arrive;
};

const travelWarnings = (
  travel: TravelTime | null,
  visitMinutes: number,
): Warning[] => {
  if (!travel) return [];
  if (travel.minutes > LONG_TRAVEL_MINUTES) {
    return [
      { kind: "long-travel", minutes: travel.minutes, reason: "over-limit" },
    ];
  }
  if (travel.minutes > visitMinutes) {
    return [
      {
        kind: "long-travel",
        minutes: travel.minutes,
        reason: "longer-than-visit",
      },
    ];
  }
  return [];
};

/** Unknown hours never warn: the Hours Status label carries that. */
const hoursWarnings = (
  availability: DayAvailability,
  arrive: number,
  start: number,
  end: number,
): Warning[] => {
  if (availability.kind === "closed") {
    return [{ kind: "closed", reason: availability.reason }];
  }
  if (availability.kind === "unknown") return [];

  const ranges = openRanges(availability);
  const current = ranges.find((r) => start >= r.open && start < r.close);
  if (!current) {
    return [
      {
        kind: "closed-on-arrival",
        arrivesAt: arrive,
        closedAt: Math.max(...ranges.map((r) => r.close)),
      },
    ];
  }
  if (end > current.close) {
    return [{ kind: "past-closing", endsAt: end, closesAt: current.close }];
  }
  return [];
};
