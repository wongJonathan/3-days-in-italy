import type { DayAvailability } from "../availability/availability.ts";
import type { SeasonalRule } from "../availability/seasonal.ts";
import type { CleanPlace } from "../data/place.ts";
import type { PlannedStop } from "../generator/generate-day.ts";
import type { IsoDate } from "../hours/calendar.ts";
import { parseHours } from "../hours/parse.ts";
import { interestLabel } from "../preferences/interests.ts";
import { formatMonth, formatTime, formatWeekday } from "../ui/format.ts";
import type { Warning } from "../schedule/schedule.ts";
import type { Reason } from "../scoring/score.ts";
import type { TravelTime } from "../travel/travel-time.ts";

/** 25 → "25 min", 60 → "1 h", 160 → "2 h 40". */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0
    ? `${hours} h`
    : `${hours} h ${String(rest).padStart(2, "0")}`;
};

/** The connector between two Stop cards: "Walk ~10 min (est.)". */
export const travelLabel = ({ band, minutes, mode }: TravelTime): string => {
  const how =
    band === "walk"
      ? "Walk"
      : band === "in-city"
        ? "Local transit"
        : mode === "rental-car"
          ? "Drive"
          : "Train or bus";
  return `${how} ~${formatDuration(minutes)} (est.)`;
};

/** "January" … "December" for month numbers 1–12. */
const monthName = (month: number): string =>
  formatMonth(`2026-${String(month).padStart(2, "0")}-01`);

const ordinal = (n: number): string =>
  `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

/** Why a Place is out of season, from its Seasonal Rules. */
const seasonText = (rules: SeasonalRule[]): string => {
  const months = rules.find((r) => r.kind === "months");
  if (months) {
    return `Closed for the season. Open ${monthName(months.from)}–${monthName(months.to)}.`;
  }
  const weekend = rules.find((r) => r.kind === "nth-weekend");
  if (weekend) {
    return `Closed today. Only open on the ${ordinal(weekend.n)} weekend of the month.`;
  }
  return "Closed for the season.";
};

/** One Warning as a sentence: the fact, then the consequence (design doc §3.5). */
export const warningText = (
  warning: Warning,
  { date, rules }: { date: IsoDate; rules: SeasonalRule[] },
): string => {
  switch (warning.kind) {
    case "closed":
      return warning.reason === "weekday"
        ? `Closed on ${formatWeekday(date)}s.`
        : seasonText(rules);
    case "closed-on-arrival":
      return `You arrive at ${formatTime(warning.arrivesAt)}, but it closes at ${formatTime(warning.closedAt)}.`;
    case "past-closing":
      return `Your visit runs to ${formatTime(warning.endsAt)}, but it closes at ${formatTime(warning.closesAt)}.`;
    case "long-travel":
      return warning.reason === "over-limit"
        ? `~${formatDuration(warning.minutes)} of travel from the previous Stop (est.).`
        : `Getting here (~${formatDuration(warning.minutes)}, est.) takes longer than the visit.`;
    case "past-day-window":
      return `Your day now ends at ${formatTime(warning.endsAt)}, after your ${formatTime(warning.windowEnd)} end time.`;
  }
};

const STATUS_LABELS = {
  known: "Hours known",
  assumed: "Hours assumed",
  unknown: "Hours unknown",
} as const;

/**
 * The quiet Hours Status label on every Stop (design doc §3.6). Vague source
 * hours are quoted, so the traveler sees what the data actually said.
 */
export const hoursLabel = (
  place: Pick<CleanPlace, "hours" | "hours_status">,
  availability: DayAvailability,
): string => {
  if (availability.kind === "unknown") return STATUS_LABELS.unknown;

  const status =
    parseHours(place.hours).kind === "vague"
      ? `Hours assumed: "${place.hours}"`
      : STATUS_LABELS[place.hours_status];

  if (availability.kind === "closed") return `${status} · closed today`;

  const [first] = availability.ranges;
  const allDay =
    availability.ranges.length === 1 && first.open === 0 && first.close >= 1440;
  const times = allDay
    ? "open all day"
    : availability.ranges
        .map((r) => `${formatTime(r.open)}–${formatTime(r.close)}`)
        .join(", ");
  return `${status} · ${times}`;
};

/** A "why it's here" chip: "Must-See", "Food", "★ 4.8", "Quiet". */
export const reasonLabel = (reason: Reason): string => {
  switch (reason.kind) {
    case "must-see":
      return "Must-See";
    case "interest":
      return interestLabel(reason.interest);
    case "rating":
      return `★ ${reason.rating}`;
    case "quiet":
      return "Quiet";
    case "tourist-heavy":
      return "Busy";
  }
};

/** The Regenerate button's tooltip, so the traveler knows what survives. */
export const regenerateHint = (stops: PlannedStop[]): string => {
  const replaced = stops.filter((s) => s.origin === "generated").length;
  const kept = stops.length - replaced;
  if (replaced === 0 && kept === 0) return "Suggests Stops for this day.";
  return `Replaces ${replaced} suggested Stop${replaced === 1 ? "" : "s"}, keeps ${kept}.`;
};
