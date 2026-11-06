import { availabilityOn } from "../availability/availability.ts";
import { rulesFor } from "../availability/seasonal-notes.ts";
import type { CleanPlace } from "../data/place.ts";
import type { IsoDate } from "../hours/calendar.ts";
import {
  BASE_CITIES,
  BASE_CITY_NAMES,
  baseCityOf,
  type BaseCity,
} from "../preferences/base-cities.ts";
import {
  SIGHTS_PER_PACE,
  type Preferences,
} from "../preferences/preferences.ts";
import {
  scheduleDay,
  type DayWindow,
  type ScheduledDay,
  type StopInput,
} from "../schedule/schedule.ts";
import { BUDGET_GROUP_ORDER, budgetGroup } from "../scoring/budget.ts";
import { rankPlaces } from "../scoring/score.ts";
import { distanceKm, type TransportMode } from "../travel/travel-time.ts";

/** Why a Stop is on the day. Must-Sees and hand-added Stops survive "Regenerate day". */
export type StopOrigin = "generated" | "must-see" | "added";

export type Meal = "lunch" | "dinner";

export type PlannedStop = {
  placeId: string;
  origin: StopOrigin;
  meal: Meal | null;
};

export type PlannedDay = {
  date: IsoDate;
  /** null for a day the traveler is building by hand from empty. */
  baseCity: BaseCity | null;
  /** True when the generator picked the city (no Day Area pinned). */
  chosenForYou: boolean;
  stops: PlannedStop[];
};

/** When a Meal Stop may start: from `from` (the visit waits until then) to `latestStart`. */
export const MEAL_WINDOWS: Record<Meal, { from: number; latestStart: number }> =
  {
    lunch: { from: 12 * 60, latestStart: 14 * 60 },
    dinner: { from: 19 * 60, latestStart: 21 * 60 },
  };

export const MEAL_TYPES = ["restaurant", "cafe"];

export type GenerateDayInput = {
  date: IsoDate;
  places: CleanPlace[];
  prefs: Preferences;
  window: DayWindow;
  /** The city pinned to this day, if any. */
  dayArea: BaseCity | null;
  /** The Trip's other planned days: their Places are never repeated. */
  otherDays: PlannedDay[];
  /** Stops to keep when regenerating (Must-Sees and hand-added), in order. */
  kept: PlannedStop[];
};

export type GeneratedDay = {
  day: PlannedDay;
  schedule: ScheduledDay;
  /** Must-Sees in other cities that no day covers yet. */
  unplannedMustSees: string[];
};

/** Turns planned Stops into scheduler input. Meal Stops wait for their meal window. */
export const toStopInputs = (
  stops: PlannedStop[],
  placesById: Map<string, CleanPlace>,
): StopInput[] =>
  stops.map((s) => ({
    place: placesById.get(s.placeId)!,
    rules: rulesFor(s.placeId),
    ...(s.meal ? { notBefore: MEAL_WINDOWS[s.meal].from } : {}),
  }));

/**
 * Builds one Trip Day (ADR 0002: one day at a time).
 * 1. Pick the day's base city (see chooseCity).
 * 2. Start from the kept Stops, then insert Must-Sees, lunch, dinner and
 *    sights, best candidates first, each at the position that ends the day earliest.
 * 3. A generated Stop is only added if it creates no new Warning, so any
 *    Warning on a generated day comes from a Stop the traveler chose to keep.
 */
export const generateDay = ({
  date,
  places,
  prefs,
  window,
  dayArea,
  otherDays,
  kept,
}: GenerateDayInput): GeneratedDay => {
  const placesById = new Map(places.map((p) => [p.id, p]));
  const used = new Set(otherDays.flatMap((d) => d.stops.map((s) => s.placeId)));
  const keptIds = new Set(kept.map((s) => s.placeId));
  const sightsTarget = SIGHTS_PER_PACE[prefs.pace];

  const context: DayContext = { date, window, mode: prefs.mode, placesById };
  const scheduleOf = (stops: PlannedStop[]) => scheduleStops(stops, context);
  const insertBest = (stops: PlannedStop[], stop: PlannedStop, force = false) =>
    insertStop(stops, stop, context, force);

  // Every Place that could still be suggested: unused, open today, not excluded
  // by rating. Ordered by budget group first, then by score (sort is stable).
  const candidates = rankPlaces(
    places.filter(
      (p) =>
        !used.has(p.id) &&
        !keptIds.has(p.id) &&
        availabilityOn(p, rulesFor(p.id), date).kind !== "closed",
    ),
    prefs,
  ).sort((a, b) => budgetRank(a.place, prefs) - budgetRank(b.place, prefs));
  const pendingMustSees = prefs.mustSees.filter(
    (id) => placesById.has(id) && !used.has(id) && !keptIds.has(id),
  );

  /** The Stops this day would get in `city`: kept, Must-Sees, meals, then sights. */
  const buildStops = (city: BaseCity): PlannedStop[] => {
    let stops: PlannedStop[] = [...kept];
    const has = (id: string) => stops.some((s) => s.placeId === id);

    pendingMustSees.forEach((id) => {
      if (baseCityOf(placesById.get(id)!) !== city) return;
      stops = insertBest(
        stops,
        { placeId: id, origin: "must-see", meal: null },
        true,
      )!;
    });

    const inCity = candidates.filter((c) => baseCityOf(c.place) === city);
    (["lunch", "dinner"] as const).forEach((meal) => {
      if (!prefs[meal]) return;

      for (const { place } of inCity) {
        if (!MEAL_TYPES.includes(place.type) || has(place.id)) continue;
        const next = insertBest(stops, {
          placeId: place.id,
          origin: "generated",
          meal,
        });
        if (next) {
          stops = next;
          break;
        }
      }
    });

    inCity.forEach(({ place }) => {
      if (sightCount(stops) >= sightsTarget) return; // Pace reached: skip the rest
      if (!isSight(place) || has(place.id)) return;
      const next = insertBest(stops, {
        placeId: place.id,
        origin: "generated",
        meal: null,
      });
      if (next) stops = next;
    });
    return stops;
  };

  // City choice needs to know whether a full day really fits in a city
  // (Places spread over towns 40-90 km apart may not), so it builds the day
  // there to find out. Each city is built at most once.
  const built = new Map<BaseCity, PlannedStop[]>();
  const stopsIn = (city: BaseCity): PlannedStop[] => {
    if (!built.has(city)) built.set(city, buildStops(city));
    return built.get(city)!;
  };

  const baseCity =
    dayArea ??
    chooseCity({
      candidates: prefs.tripArea.length > 0 ? prefs.tripArea : BASE_CITY_NAMES,
      tripAreaChosen: prefs.tripArea.length > 0,
      previousCity: previousDayBefore(otherDays, date)?.baseCity ?? null,
      visited: new Set(
        otherDays.flatMap((d) => (d.baseCity ? [d.baseCity] : [])),
      ),
      mustSeeCities: new Set(
        pendingMustSees.map((id) => baseCityOf(placesById.get(id)!)),
      ),
      fullDayFits: (city) => sightCount(stopsIn(city)) >= sightsTarget,
      strength: (city) =>
        candidates
          .filter((c) => baseCityOf(c.place) === city && isSight(c.place))
          .slice(0, sightsTarget)
          .reduce((sum, c) => sum + c.points, 0),
    });

  const stops = stopsIn(baseCity);
  return {
    day: { date, baseCity, chosenForYou: dayArea === null, stops },
    schedule: scheduleOf(stops),
    unplannedMustSees: pendingMustSees.filter(
      (id) => !stops.some((s) => s.placeId === id),
    ),
  };
};

const sightCount = (stops: PlannedStop[]): number =>
  stops.filter((s) => s.meal === null).length;

/** What scheduling a day needs besides its Stops. */
export type DayContext = {
  date: IsoDate;
  window: DayWindow;
  mode: TransportMode;
  placesById: Map<string, CleanPlace>;
};

export const scheduleStops = (
  stops: PlannedStop[],
  { date, window, mode, placesById }: DayContext,
): ScheduledDay =>
  scheduleDay({ date, window, mode, stops: toStopInputs(stops, placesById) });

/**
 * Tries `stop` at every position. Returns the arrangement that ends earliest
 * without adding a Warning or pushing a meal late, or null if none does.
 * `force` (Must-Sees, or a Place the traveler adds) always places it, at the
 * position with the fewest Warnings, then the earliest end.
 */
export const insertStop = (
  stops: PlannedStop[],
  stop: PlannedStop,
  context: DayContext,
  force = false,
): PlannedStop[] | null => {
  const baseline = scheduleStops(stops, context).warningCount;

  // One trial per position: before the first Stop, between each pair, after the last.
  const trials = Array.from({ length: stops.length + 1 }, (_, i) => [
    ...stops.slice(0, i),
    stop,
    ...stops.slice(i),
  ]);
  // reduce, not forEach: this keeps "the best so far", and TypeScript can't
  // follow a variable reassigned inside a forEach callback.
  const best = trials.reduce<{
    stops: PlannedStop[];
    schedule: ScheduledDay;
  } | null>((best, trial) => {
    const schedule = scheduleStops(trial, context);
    const clean =
      schedule.warningCount <= baseline && mealsOnTime(trial, schedule);
    if (!clean && !force) return best;
    return best === null || isBetter(schedule, best.schedule, force)
      ? { stops: trial, schedule }
      : best;
  }, null);
  return best?.stops ?? null;
};

/**
 * Compares two arrangements. Normally the one that ends the day earlier wins.
 * When forcing a Must-See in, fewer Warnings matters first.
 */
const isBetter = (
  candidate: ScheduledDay,
  current: ScheduledDay,
  force: boolean,
): boolean => {
  if (force && candidate.warningCount !== current.warningCount) {
    return candidate.warningCount < current.warningCount;
  }
  return candidate.endsAt < current.endsAt;
};

/** Restaurants are only ever Meal Stops; everything else can be a sight. */
const isSight = (place: CleanPlace): boolean => place.type !== "restaurant";

const budgetRank = (place: CleanPlace, prefs: Preferences): number =>
  BUDGET_GROUP_ORDER.indexOf(budgetGroup(place.price_range, prefs.budget));

/** Every Meal Stop still starts by the end of its meal window. */
const mealsOnTime = (stops: PlannedStop[], schedule: ScheduledDay): boolean =>
  stops.every(
    (s, i) =>
      s.meal === null ||
      schedule.stops[i].start <= MEAL_WINDOWS[s.meal].latestStart,
  );

const previousDayBefore = (
  days: PlannedDay[],
  date: IsoDate,
): PlannedDay | null =>
  days
    .filter((d) => d.date < date)
    .reduce<PlannedDay | null>(
      (latest, d) => (latest === null || d.date > latest.date ? d : latest),
      null,
    );

type CityChoice = {
  candidates: BaseCity[];
  tripAreaChosen: boolean;
  previousCity: BaseCity | null;
  visited: Set<BaseCity>;
  mustSeeCities: Set<BaseCity>;
  /** True when a day built in this city reaches the Pace without any Warning. */
  fullDayFits: (city: BaseCity) => boolean;
  /** How good the city's best sights are (sum of their scores). */
  strength: (city: BaseCity) => number;
};

/**
 * Picks the day's base city when no Day Area is pinned. First rule that matches:
 * 1. a city with a Must-See no day covers yet;
 * 2. a Trip Area city not visited yet where a full day fits;
 * 3. the previous day's city, if a full day still fits there;
 * 4. any city where a full day fits;
 * 5. any candidate.
 * Within a rule: nearest to the previous day's city, or (on day 1) the city
 * whose best sights score highest. BASE_CITIES order breaks ties.
 */
const chooseCity = ({
  candidates,
  tripAreaChosen,
  previousCity,
  visited,
  mustSeeCities,
  fullDayFits: enough,
  strength,
}: CityChoice): BaseCity => {
  const pick = (cities: BaseCity[]): BaseCity | null => {
    if (cities.length === 0) return null;
    const ordered = BASE_CITY_NAMES.filter((c) => cities.includes(c));
    return [...ordered].sort((a, b) =>
      previousCity
        ? distanceKm(BASE_CITIES[a], BASE_CITIES[previousCity]) -
          distanceKm(BASE_CITIES[b], BASE_CITIES[previousCity])
        : strength(b) - strength(a),
    )[0];
  };

  return (
    pick(candidates.filter((c) => mustSeeCities.has(c))) ??
    (tripAreaChosen
      ? pick(candidates.filter((c) => !visited.has(c) && enough(c)))
      : null) ??
    (previousCity && candidates.includes(previousCity) && enough(previousCity)
      ? previousCity
      : null) ??
    pick(candidates.filter(enough)) ??
    pick(candidates)!
  );
};
