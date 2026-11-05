import { availabilityOn } from "../availability/availability.ts";
import { rulesFor } from "../availability/seasonal-notes.ts";
import type { CleanPlace } from "../data/place.ts";
import { addDays, type IsoDate } from "../hours/calendar.ts";
import {
  BASE_CITY_NAMES,
  baseCityOf,
  type BaseCity,
} from "../preferences/base-cities.ts";
import { interestLabel } from "../preferences/interests.ts";
import type { Preferences } from "../preferences/preferences.ts";
import { formatMonth, formatWeekday } from "../ui/format.ts";

/**
 * Something worth knowing about the chosen dates, shown under the date picker.
 * Names are the most notable Places first (highest rated).
 * - weekday: Places closed that weekday on one of the Trip's dates.
 * - season:  Places closed for the season on any of the Trip's dates.
 */
export type HeadsUp =
  | { kind: "weekday"; date: IsoDate; names: string[] }
  | { kind: "season"; date: IsoDate; names: string[] };

export type CityCount = { total: number; open: number; towns: string[] };

const TRIP_LENGTH = 3;

/** The 3 dates of a Trip starting on `start`. */
export const tripDates = (start: IsoDate): IsoDate[] =>
  Array.from({ length: TRIP_LENGTH }, (_, i) => addDays(start, i));

const availability = (place: CleanPlace, date: IsoDate) =>
  availabilityOn(place, rulesFor(place.id), date);

/** Names, most notable (highest rated) first. */
const namesByRating = (places: CleanPlace[]): string[] =>
  [...places]
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name))
    .map((p) => p.name);

/** Weekday closures for each Trip date, then one note for anything out of season. */
export const headsUps = (places: CleanPlace[], start: IsoDate): HeadsUp[] => {
  const dates = tripDates(start);
  const closedFor = (reason: "weekday" | "season", date: IsoDate) =>
    places.filter((p) => {
      const a = availability(p, date);
      return a.kind === "closed" && a.reason === reason;
    });

  const weekday: HeadsUp[] = dates.flatMap((date) => {
    const closed = closedFor("weekday", date);
    return closed.length > 0
      ? [{ kind: "weekday" as const, date, names: namesByRating(closed) }]
      : [];
  });

  const outOfSeason = places.filter((p) =>
    dates.some((date) => closedFor("season", date).includes(p)),
  );
  const season: HeadsUp[] =
    outOfSeason.length > 0
      ? [{ kind: "season", date: start, names: namesByRating(outOfSeason) }]
      : [];

  return [...weekday, ...season];
};

/** Per Base City: how many Places, how many open on at least one Trip date, and its towns. */
export const cityCounts = (
  places: CleanPlace[],
  start: IsoDate,
): Record<BaseCity, CityCount> => {
  const dates = tripDates(start);
  const counts = Object.fromEntries(
    BASE_CITY_NAMES.map((city): [BaseCity, CityCount] => [
      city,
      { total: 0, open: 0, towns: [] },
    ]),
  ) as Record<BaseCity, CityCount>;

  places.forEach((place) => {
    const count = counts[baseCityOf(place)];
    count.total++;
    if (dates.some((date) => availability(place, date).kind !== "closed")) {
      count.open++;
    }
    const isTown = place.city !== baseCityOf(place);
    if (isTown && !count.towns.includes(place.city)) {
      count.towns.push(place.city);
    }
  });
  return counts;
};

/** True when `date` is before today (in Rome). ISO dates sort as text. */
export const isPastDate = (date: IsoDate, today: IsoDate): boolean =>
  date < today;

const PACE_LABELS: Record<Preferences["pace"], string> = {
  relaxed: "Relaxed",
  balanced: "Balanced",
  packed: "Packed",
};

const MODE_LABELS: Record<Preferences["mode"], string> = {
  "public-transport": "Public transport",
  "rental-car": "Rental car",
};

/** The collapsed "Tune it" line, so the traveler sees what was assumed. */
export const tuneSummary = (prefs: Preferences): string => {
  const meals =
    prefs.lunch && prefs.dinner
      ? "Lunch + Dinner"
      : prefs.lunch
        ? "Lunch"
        : prefs.dinner
          ? "Dinner"
          : "No meals";
  const mustSees = prefs.mustSees.length;
  return [
    prefs.interests.length > 0
      ? prefs.interests.map(interestLabel).join(", ")
      : null,
    PACE_LABELS[prefs.pace],
    prefs.budget ?? "Any budget",
    MODE_LABELS[prefs.mode],
    meals,
    mustSees > 0 ? `${mustSees} Must-See${mustSees === 1 ? "" : "s"}` : null,
  ]
    .filter((part) => part !== null)
    .join(" · ");
};

/**
 * One sentence per heads-up, naming the most notable Places:
 * "Sunday: Vatican Museums and 15 other places are closed."
 * "November: Lake Como, Chianti and 3 more are out of season."
 */
export const headsUpText = ({ kind, date, names }: HeadsUp): string => {
  const [first, second, ...rest] = names;
  if (kind === "weekday") {
    const others = names.length - 1;
    const subject =
      others === 0
        ? `${first} is`
        : `${first} and ${others} other place${others === 1 ? "" : "s"} are`;
    return `${formatWeekday(date)}: ${subject} closed.`;
  }
  const subject =
    names.length === 1
      ? `${first} is`
      : rest.length === 0
        ? `${first} and ${second} are`
        : `${first}, ${second} and ${rest.length} more are`;
  return `${formatMonth(date)}: ${subject} out of season.`;
};
