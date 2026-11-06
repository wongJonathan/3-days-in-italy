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
import { formatMonth, formatWeekday } from "../format.ts";

/**
 * Something worth knowing about the chosen dates, shown under the date picker.
 * Names are the most notable Places first (highest rated).
 * - weekday: Places closed that weekday on one of the Trip's dates.
 * - season:  Places closed for the season on any of the Trip's dates.
 */
export type HeadsUp =
  | { kind: "weekday"; date: IsoDate; names: string[] }
  | { kind: "season"; date: IsoDate; names: string[] };

/**
 * A Base City on the date picker's dates: how many Places it has, how many are
 * open on at least one Trip date, its day-trip towns, and its best-rated open
 * Places (short names) to show off on the city card.
 */
export type CityCount = {
  total: number;
  open: number;
  towns: string[];
  highlights: string[];
};

const HIGHLIGHTS = 3;

const TRIP_LENGTH = 3;

export const tripDates = (start: IsoDate): IsoDate[] =>
  Array.from({ length: TRIP_LENGTH }, (_, i) => addDays(start, i));

const availability = (place: CleanPlace, date: IsoDate) =>
  availabilityOn(place, rulesFor(place.id), date);

/**
 * A Place's name without the town after a comma ("Cheese and Prosciutto Tour,
 * Parma" → "Cheese and Prosciutto Tour"), so it reads well inside a list.
 */
export const shortName = (name: string): string => name.split(", ")[0];

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

/** Per Base City: its Place counts, towns and highlights (see CityCount). */
export const cityCounts = (
  places: CleanPlace[],
  start: IsoDate,
): Record<BaseCity, CityCount> => {
  const dates = tripDates(start);
  const counts = Object.fromEntries(
    BASE_CITY_NAMES.map((city): [BaseCity, CityCount] => [
      city,
      { total: 0, open: 0, towns: [], highlights: [] },
    ]),
  ) as Record<BaseCity, CityCount>;
  const openPlaces = Object.fromEntries(
    BASE_CITY_NAMES.map((city): [BaseCity, CleanPlace[]] => [city, []]),
  ) as Record<BaseCity, CleanPlace[]>;

  places.forEach((place) => {
    const city = baseCityOf(place);
    const count = counts[city];
    count.total++;
    if (dates.some((date) => availability(place, date).kind !== "closed")) {
      count.open++;
      openPlaces[city].push(place);
    }
    const isTown = place.city !== city;
    if (isTown && !count.towns.includes(place.city)) {
      count.towns.push(place.city);
    }
  });

  BASE_CITY_NAMES.forEach((city) => {
    counts[city].highlights = namesByRating(openPlaces[city])
      .slice(0, HIGHLIGHTS)
      .map(shortName);
  });
  return counts;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * The count line on a city card: "15 places to choose from · 3 closed on your
 * dates". Closures are mentioned only when there are some.
 */
export const cityLine = ({ total, open }: CityCount): string => {
  const closed = total - open;
  const choose = `${plural(open, "place")} to choose from`;
  return closed > 0 ? `${choose} · ${closed} closed on your dates` : choose;
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

/** The collapsed "Make it yours" line, so the traveler sees what was assumed. */
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
 * One sentence per heads-up, the count first, then the most notable Places
 * (short names, so a comma in a name doesn't read as a list):
 * "Sunday: 16 places are closed, including Vatican Museums."
 * "November: Lake Como, Chianti and 3 more are out of season."
 */
export const headsUpText = (headsUp: HeadsUp): string => {
  const { kind, date } = headsUp;
  const names = headsUp.names.map(shortName);
  const [first, second, ...rest] = names;
  if (kind === "weekday") {
    return names.length === 1
      ? `${formatWeekday(date)}: ${first} is closed.`
      : `${formatWeekday(date)}: ${names.length} places are closed, including ${first}.`;
  }
  const subject =
    names.length === 1
      ? `${first} is`
      : rest.length === 0
        ? `${first} and ${second} are`
        : `${first}, ${second} and ${rest.length} more are`;
  return `${formatMonth(date)}: ${subject} out of season.`;
};
