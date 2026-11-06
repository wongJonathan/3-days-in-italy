import {
  availabilityOn,
  type DayAvailability,
} from "../availability/availability.ts";
import { rulesFor } from "../availability/seasonal-notes.ts";
import type { CleanPlace } from "../data/place.ts";
import { baseCityOf, type BaseCity } from "../preferences/base-cities.ts";
import { INTEREST_TAGS, type Interest } from "../preferences/interests.ts";
import {
  BUDGET_GROUP_ORDER,
  budgetGroup,
  type BudgetGroup,
} from "../scoring/budget.ts";
import { scorePlace, type Reason } from "../scoring/score.ts";
import type { Trip } from "../../stores/trip.ts";

/**
 * Which part of Italy the list browses (design doc §8.3):
 * - day:  the open day's city;
 * - trip: the Trip Area ("My Where");
 * - all:  every Place.
 */
export type ListScope = "day" | "trip" | "all";

export type ListFilters = {
  openOnly: boolean;
  scope: ListScope;
  /** Show only Places matching at least one of these. Empty = no filter. */
  interests: Interest[];
  /** Search text. Search covers every Place, whatever the scope. */
  query: string;
};

export const DEFAULT_FILTERS: ListFilters = {
  openOnly: true,
  scope: "day",
  interests: [],
  query: "",
};

export type ListRow = {
  place: CleanPlace;
  /** Score points, or null when the Place is rated under 4.0 (still listed). */
  points: number | null;
  reasons: Reason[];
  availability: DayAvailability;
  /** Indexes of other days that already have this Place. */
  onOtherDays: number[];
};

/** "all" is the single group used when no Budget is set. */
export type ListGroup = { group: BudgetGroup | "all"; rows: ListRow[] };

export type PlaceList = {
  /** The cities the scope covers, or null for all of Italy. */
  scopeCities: BaseCity[] | null;
  groups: ListGroup[];
  /** Search matches outside the scope, shown in their own section. */
  outside: ListRow[];
};

const scopeCitiesFor = (
  trip: Trip,
  dayIndex: number,
  scope: ListScope,
): BaseCity[] | null => {
  if (scope === "all") return null;
  if (scope === "day") {
    const day = trip.days[dayIndex];
    // A pinned Day Area wins: pinning a city updates the list straight away,
    // before the traveler regenerates the day.
    const city = day.dayArea ?? day.plan?.baseCity;
    // A day with no city yet (built from empty) falls back to "My Where".
    if (city) return [city];
  }
  return trip.prefs.tripArea.length > 0 ? trip.prefs.tripArea : null;
};

/** At least one chosen Interest matches. Avoid Crowds keeps all but tourist-heavy Places. */
const matchesInterests = (place: CleanPlace, interests: Interest[]) => {
  if (interests.length === 0) return true;
  const tags = new Set(place.tags);
  return interests.some((interest) =>
    interest === "avoid-crowds"
      ? !tags.has("tourist-heavy")
      : INTEREST_TAGS[interest].tags.some((tag) => tags.has(tag)),
  );
};

/** Best score first; Places rated under 4.0 (no score) last; then rating, then name. */
const byScore = (a: ListRow, b: ListRow): number =>
  (b.points ?? -Infinity) - (a.points ?? -Infinity) ||
  b.place.rating - a.place.rating ||
  a.place.name.localeCompare(b.place.name);

/**
 * The Place list for the open day (design doc §3.7, §8.3).
 * Browsing is limited by scope and filters; search ignores both, so a Place
 * the traveler knows exists is always found ("search would lie" otherwise).
 */
export const buildPlaceList = (
  trip: Trip,
  dayIndex: number,
  places: CleanPlace[],
  filters: ListFilters,
): PlaceList => {
  const day = trip.days[dayIndex];
  const scopeCities = scopeCitiesFor(trip, dayIndex, filters.scope);
  const inScope = (p: CleanPlace) =>
    scopeCities === null || scopeCities.includes(baseCityOf(p));
  // Places already on this day are in the schedule, so the list hides them.
  const onThisDay = new Set(day.plan?.stops.map((s) => s.placeId) ?? []);
  const addable = places.filter((p) => !onThisDay.has(p.id));

  const toRow = (place: CleanPlace): ListRow => {
    const score = scorePlace(place, trip.prefs);
    return {
      place,
      points: score.kind === "scored" ? score.points : null,
      reasons: score.kind === "scored" ? score.reasons : [],
      availability: availabilityOn(place, rulesFor(place.id), day.date),
      onOtherDays: trip.days.flatMap((d, i) =>
        i !== dayIndex && d.plan?.stops.some((s) => s.placeId === place.id)
          ? [i]
          : [],
      ),
    };
  };

  const query = filters.query.trim().toLowerCase();
  let inside: ListRow[];
  let outside: ListRow[] = [];

  if (query) {
    const matches = addable
      .filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.city.toLowerCase().includes(query),
      )
      .map(toRow);
    inside = matches.filter((r) => inScope(r.place));
    outside = matches.filter((r) => !inScope(r.place)).sort(byScore);
  } else {
    inside = addable
      .filter((p) => inScope(p) && matchesInterests(p, filters.interests))
      .map(toRow)
      .filter((r) => !filters.openOnly || r.availability.kind !== "closed");
  }
  inside.sort(byScore);

  const { budget } = trip.prefs;
  const groups: ListGroup[] =
    budget === null
      ? [{ group: "all", rows: inside }]
      : BUDGET_GROUP_ORDER.map((group) => ({
          group,
          rows: inside.filter(
            (r) => budgetGroup(r.place.price_range, budget) === group,
          ),
        }));

  return { scopeCities, groups, outside };
};
