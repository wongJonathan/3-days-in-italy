import type { CleanPlace } from "../data/place.ts";
import { weekdayOf, type IsoDate } from "../hours/calendar.ts";
import { parseHours, type OpenRange, type VaguePhrase } from "../hours/parse.ts";
import { inSeason, seasonalHours, type SeasonalRule } from "./seasonal.ts";

/** Whether a Place can be visited on one date, and how sure we are. */
export type DayAvailability =
  | { kind: "open"; ranges: OpenRange[]; hoursStatus: "known" | "assumed" }
  | { kind: "closed"; reason: "weekday" | "season" }
  | { kind: "unknown" };

/** What a vague phrase is assumed to mean, in minutes after midnight. */
export const VAGUE_HOURS: Record<VaguePhrase, OpenRange> = {
  evenings: { open: 18 * 60, close: 24 * 60 },
  "morning-only": { open: 8 * 60, close: 12 * 60 },
};

/**
 * Answers "can this Place be visited on this date, and when?".
 * Order matters: season first (a closed season beats unknown hours),
 * then the day's hours.
 */
export const availabilityOn = (
  place: Pick<CleanPlace, "hours" | "hours_status">,
  rules: SeasonalRule[],
  date: IsoDate,
): DayAvailability => {
  if (!inSeason(rules, date)) return { kind: "closed", reason: "season" };

  const parsed = parseHours(seasonalHours(rules, date) ?? place.hours);
  const hoursStatus =
    place.hours_status === "assumed" ? "assumed" : "known";

  switch (parsed.kind) {
    case "weekly": {
      const ranges = parsed.week[weekdayOf(date)];
      return ranges.length === 0
        ? { kind: "closed", reason: "weekday" }
        : { kind: "open", ranges, hoursStatus };
    }
    case "vague":
      return {
        kind: "open",
        ranges: [VAGUE_HOURS[parsed.phrase]],
        hoursStatus: "assumed",
      };
    case "missing":
    case "unrecognized":
      return { kind: "unknown" };
  }
};
