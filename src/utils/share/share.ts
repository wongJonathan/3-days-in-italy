/**
 * The Shared Trip link: a Finalized Trip written as short, readable query
 * params (see docs/adr/0003-shared-trip-in-url.md).
 *
 *   v=1&start=2026-11-10&transport=car&interests=food,art
 *   &day1=rome:1m,5,12l,30ad&day2=&day3=florence:41&hours3=08:00-23:00
 *
 * Each Stop is its Place number plus optional flags: m = must-see,
 * a = added, l = lunch, d = dinner. A day's city is optional, and `hoursN`
 * only appears when that day's Day Window isn't the default.
 *
 * Links outlive the code: every released version must keep decoding.
 */
import type { LoadedTrip } from "../../stores/storage.ts";
import { TRIP_LENGTH, type Trip, type TripDay } from "../../stores/trip.ts";
import type {
  Meal,
  PlannedStop,
  StopOrigin,
} from "../generator/generate-day.ts";
import { addDays, type IsoDate } from "../hours/calendar.ts";
import { BASE_CITY_NAMES, type BaseCity } from "../preferences/base-cities.ts";
import { INTERESTS, type Interest } from "../preferences/interests.ts";
import { DEFAULT_PREFERENCES } from "../preferences/preferences.ts";
import { DEFAULT_DAY_WINDOW, type DayWindow } from "../schedule/schedule.ts";
import type { TransportMode } from "../travel/travel-time.ts";

const VERSION = "1";

/** Dataset ids are `place_001`; the link only carries the number. */
const ID_PREFIX = "place_";

const TRANSPORT: Record<TransportMode, string> = {
  "public-transport": "transit",
  "rental-car": "car",
};

const ORIGIN_FLAG: Record<StopOrigin, string> = {
  generated: "",
  "must-see": "m",
  added: "a",
};

const MEAL_FLAG: Record<Meal, string> = { lunch: "l", dinner: "d" };

/** Reverses a value → code table, skipping empty codes. */
const invert = <T extends string>(table: Record<T, string>) =>
  new Map(
    (Object.entries(table) as [T, string][])
      .filter(([, code]) => code !== "")
      .map(([value, code]) => [code, value]),
  );

const TRANSPORT_BY_CODE = invert(TRANSPORT);
const ORIGIN_BY_FLAG = invert(ORIGIN_FLAG);
const MEAL_BY_FLAG = invert(MEAL_FLAG);

const CITY_BY_CODE = new Map(
  BASE_CITY_NAMES.map((city) => [city.toLowerCase(), city]),
);

// ---------- Writing ----------

const pad = (n: number) => String(n).padStart(2, "0");

const formatTime = (minutes: number) =>
  `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

const writeStop = ({ placeId, origin, meal }: PlannedStop) =>
  String(Number(placeId.slice(ID_PREFIX.length))) +
  ORIGIN_FLAG[origin] +
  (meal ? MEAL_FLAG[meal] : "");

const writeDay = (day: TripDay) => {
  const city = day.plan?.baseCity ?? day.dayArea;
  const stops = (day.plan?.stops ?? []).map(writeStop).join(",");
  return city ? `${city.toLowerCase()}:${stops}` : stops;
};

const isDefaultWindow = (window: DayWindow) =>
  window.start === DEFAULT_DAY_WINDOW.start &&
  window.end === DEFAULT_DAY_WINDOW.end;

/**
 * The link's query string, without the leading "?". Built by hand rather
 * than with URLSearchParams, which would escape every `,` and `:` and make
 * the link unreadable. Every value is already URL-safe.
 */
export const shareQuery = (trip: Trip): string => {
  const { interests, mode } = trip.prefs;
  const params = [
    `v=${VERSION}`,
    `start=${trip.startDate}`,
    `transport=${TRANSPORT[mode]}`,
    ...(interests.length > 0 ? [`interests=${interests.join(",")}`] : []),
    ...trip.days.map((day, i) => `day${i + 1}=${writeDay(day)}`),
    ...trip.days.flatMap((day, i) =>
      isDefaultWindow(day.window)
        ? []
        : [
            `hours${i + 1}=${formatTime(day.window.start)}-${formatTime(day.window.end)}`,
          ],
    ),
  ];
  return params.join("&");
};

// ---------- Reading ----------
// Anyone can edit a link, so everything is checked. Each reader returns null
// for anything it can't read, and one null rejects the whole link.

const readDate = (text: string | null): IsoDate | null =>
  text !== null &&
  /^\d{4}-\d{2}-\d{2}$/.test(text) &&
  // An impossible date (Feb 30) rolls over to another one.
  addDays(text, 0) === text
    ? text
    : null;

const readTime = (text: string) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

/** A missing param is the default Day Window. */
const readWindow = (text: string | null): DayWindow | null => {
  if (text === null) return DEFAULT_DAY_WINDOW;
  const [startText, endText, ...rest] = text.split("-");
  if (endText === undefined || rest.length > 0) return null;
  const start = readTime(startText);
  const end = readTime(endText);
  return start !== null && end !== null && start < end ? { start, end } : null;
};

const readStop = (text: string): PlannedStop | null => {
  const match = /^([1-9]\d*)([a-z]*)$/.exec(text);
  if (!match) return null;
  const flags = [...match[2]];
  const origins = flags.flatMap((f) => ORIGIN_BY_FLAG.get(f) ?? []);
  const meals = flags.flatMap((f) => MEAL_BY_FLAG.get(f) ?? []);
  const valid =
    origins.length <= 1 &&
    meals.length <= 1 &&
    // Every flag is known and none is repeated.
    origins.length + meals.length === flags.length;
  return valid
    ? {
        placeId: ID_PREFIX + match[1].padStart(3, "0"),
        origin: origins[0] ?? "generated",
        meal: meals[0] ?? null,
      }
    : null;
};

type SharedDay = { city: BaseCity | null; stops: PlannedStop[] };

const readDay = (text: string | null): SharedDay | null => {
  if (text === null) return null;
  const colon = text.indexOf(":");
  const cityCode = colon === -1 ? null : text.slice(0, colon).toLowerCase();
  const city = cityCode === null ? null : CITY_BY_CODE.get(cityCode);
  if (city === undefined) return null;

  const list = colon === -1 ? text : text.slice(colon + 1);
  const stops = (list === "" ? [] : list.split(",")).map(readStop);
  const ids = stops.map((s) => s?.placeId);
  const valid = !stops.includes(null) && new Set(ids).size === ids.length;
  return valid ? { city, stops: stops as PlannedStop[] } : null;
};

/** Unknown Interests are dropped: they only change the "why" chips. */
const readInterests = (text: string | null): Interest[] =>
  (text ?? "")
    .split(",")
    .filter((i): i is Interest => INTERESTS.includes(i as Interest));

const DAY_NUMBERS = Array.from({ length: TRIP_LENGTH }, (_, i) => i + 1);

/**
 * Rebuilds a Finalized Trip from a link's query string (with or without the
 * "?"), or null when the link can't be read. Params it doesn't know (utm_…)
 * are ignored. Stops whose Place has left the data are dropped and counted,
 * as with a saved Trip.
 */
export const readSharedTrip = (
  query: string,
  placeIds: Set<string>,
): LoadedTrip | null => {
  const params = new URLSearchParams(query);
  const startDate = readDate(params.get("start"));
  const mode = TRANSPORT_BY_CODE.get(params.get("transport") ?? "");
  const days = DAY_NUMBERS.map((n) => readDay(params.get(`day${n}`)));
  const windows = DAY_NUMBERS.map((n) => readWindow(params.get(`hours${n}`)));
  if (
    params.get("v") !== VERSION ||
    !startDate ||
    !mode ||
    days.includes(null) ||
    windows.includes(null)
  ) {
    return null;
  }

  let removedStops = 0;
  const tripDays = (days as SharedDay[]).map((shared, i): TripDay => {
    const date = addDays(startDate, i);
    const stops = shared.stops.filter((s) => placeIds.has(s.placeId));
    removedStops += shared.stops.length - stops.length;
    const plan = { date, baseCity: shared.city, chosenForYou: false, stops };
    return {
      date,
      window: windows[i] as DayWindow,
      dayArea: null,
      plan,
      status: "finalized",
      saved: plan,
    };
  });

  const mustSees = tripDays.flatMap((d) =>
    (d.plan?.stops ?? [])
      .filter((s) => s.origin === "must-see")
      .map((s) => s.placeId),
  );

  const trip: Trip = {
    version: 1,
    startDate,
    prefs: {
      ...DEFAULT_PREFERENCES,
      mode,
      interests: readInterests(params.get("interests")),
      mustSees: [...new Set(mustSees)],
    },
    startEmpty: false,
    days: tripDays,
    openDay: 0,
  };
  return { trip, removedStops };
};
