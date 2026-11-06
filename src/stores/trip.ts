import type { CleanPlace } from "../utils/data/place.ts";
import {
  generateDay,
  insertStop,
  type DayContext,
  type PlannedDay,
  type PlannedStop,
} from "../utils/generator/generate-day.ts";
import { addDays, type IsoDate } from "../utils/hours/calendar.ts";
import type { BaseCity } from "../utils/preferences/base-cities.ts";
import type { Preferences } from "../utils/preferences/preferences.ts";
import {
  DEFAULT_DAY_WINDOW,
  type DayWindow,
} from "../utils/schedule/schedule.ts";

/**
 * - draft:     not opened yet.
 * - editing:   opened and being worked on (including a finalized day changed again).
 * - finalized: signed off by the traveler.
 */
export type DayStatus = "draft" | "editing" | "finalized";

export type TripDay = {
  date: IsoDate;
  window: DayWindow;
  /** The city pinned to this day, if any. */
  dayArea: BaseCity | null;
  /** The working copy. null until the day is first opened. */
  plan: PlannedDay | null;
  status: DayStatus;
  /** The version at the last Finalize, for "Revert to saved". */
  saved: PlannedDay | null;
};

export type Trip = {
  /** Bumped when the saved shape changes, so old saves are recognised. */
  version: 1;
  startDate: IsoDate;
  prefs: Preferences;
  /** True when the traveler chose "Start with empty days". */
  startEmpty: boolean;
  days: TripDay[];
  /** Index of the day shown in the editor. */
  openDay: number;
};

export type TripAction =
  | { type: "openDay"; day: number }
  | { type: "moveStop"; day: number; from: number; to: number }
  | { type: "removeStop"; day: number; index: number }
  | { type: "addPlace"; day: number; placeId: string }
  | { type: "regenerate"; day: number }
  | { type: "finalize"; day: number }
  | { type: "revert"; day: number }
  | { type: "setWindow"; day: number; window: DayWindow }
  | { type: "setDayArea"; day: number; city: BaseCity | null }
  | { type: "toggleMustSee"; placeId: string };

export type NewTrip = {
  startDate: IsoDate;
  prefs: Preferences;
  startEmpty: boolean;
};

const TRIP_LENGTH = 3;

/** A new Trip with Day 1 open (planned, or empty for "Start with empty days"). */
export const createTrip = (
  { startDate, prefs, startEmpty }: NewTrip,
  places: CleanPlace[],
): Trip => {
  const days: TripDay[] = Array.from({ length: TRIP_LENGTH }, (_, i) => ({
    date: addDays(startDate, i),
    window: DEFAULT_DAY_WINDOW,
    dayArea: null,
    plan: null,
    status: "draft",
    saved: null,
  }));
  const trip: Trip = {
    version: 1,
    startDate,
    prefs,
    startEmpty,
    days,
    openDay: 0,
  };
  return tripReducer(places)(trip, { type: "openDay", day: 0 });
};

/**
 * Every editor action, as one pure function: (trip, action) → new trip.
 * Curried with the Places so React's useReducer can call it directly.
 * An action that changes nothing returns the same Trip object, so React
 * knows it can skip re-rendering.
 */
export const tripReducer = (places: CleanPlace[]) => {
  const placesById = new Map(places.map((p) => [p.id, p]));

  const contextFor = (trip: Trip, day: TripDay): DayContext => ({
    date: day.date,
    window: day.window,
    mode: trip.prefs.mode,
    placesById,
  });

  const generate = (trip: Trip, index: number, kept: PlannedStop[]) => {
    const day = trip.days[index];
    return generateDay({
      date: day.date,
      places,
      prefs: trip.prefs,
      window: day.window,
      dayArea: day.dayArea,
      otherDays: trip.days.flatMap((d, i) =>
        i !== index && d.plan ? [d.plan] : [],
      ),
      kept,
    }).day;
  };

  const withDay = (trip: Trip, index: number, changes: Partial<TripDay>) => ({
    ...trip,
    days: trip.days.map((d, i) => (i === index ? { ...d, ...changes } : d)),
  });

  /** Applies a change to a day's Stops; `change` returns null for "no change". */
  const editStops = (
    trip: Trip,
    index: number,
    change: (stops: PlannedStop[], day: TripDay) => PlannedStop[] | null,
  ): Trip => {
    const day = trip.days[index];
    if (!day?.plan) return trip;
    const stops = change(day.plan.stops, day);
    if (!stops) return trip;
    return withDay(trip, index, {
      plan: { ...day.plan, stops },
      status: "editing",
    });
  };

  const reduce = (trip: Trip, action: TripAction): Trip => {
    switch (action.type) {
      case "openDay": {
        const day = trip.days[action.day];
        if (!day) return trip;
        const plan =
          day.plan ??
          (trip.startEmpty
            ? {
                date: day.date,
                baseCity: day.dayArea,
                chosenForYou: false,
                stops: [],
              }
            : generate(trip, action.day, []));
        return {
          ...withDay(trip, action.day, {
            plan,
            status: day.status === "draft" ? "editing" : day.status,
          }),
          openDay: action.day,
        };
      }

      case "moveStop":
        return editStops(trip, action.day, (stops) => {
          const { from, to } = action;
          if (from === to || !inRange(stops, from) || !inRange(stops, to)) {
            return null;
          }
          const moved = [...stops];
          moved.splice(to, 0, ...moved.splice(from, 1));
          return moved;
        });

      case "removeStop":
        return editStops(trip, action.day, (stops) =>
          inRange(stops, action.index)
            ? stops.filter((_, i) => i !== action.index)
            : null,
        );

      case "addPlace":
        return editStops(trip, action.day, (stops, day) => {
          if (!placesById.has(action.placeId)) return null;
          if (stops.some((s) => s.placeId === action.placeId)) return null;
          // force: always added, at the position with the fewest Warnings.
          return insertStop(
            stops,
            { placeId: action.placeId, origin: "added", meal: null },
            contextFor(trip, day),
            true,
          );
        });

      case "regenerate": {
        const day = trip.days[action.day];
        if (!day?.plan) return trip;
        const kept = day.plan.stops.filter((s) => s.origin !== "generated");
        return withDay(trip, action.day, {
          plan: generate(trip, action.day, kept),
          status: "editing",
        });
      }

      case "finalize": {
        const day = trip.days[action.day];
        if (!day?.plan) return trip;
        const finalized = withDay(trip, action.day, {
          status: "finalized",
          saved: day.plan,
        });
        // The next day not yet finalized, looking forward first.
        const indexes = finalized.days.map((_, i) => i);
        const next = [
          ...indexes.filter((i) => i > action.day),
          ...indexes.filter((i) => i < action.day),
        ].find((i) => finalized.days[i].status !== "finalized");
        return next === undefined
          ? finalized
          : reduce(finalized, { type: "openDay", day: next });
      }

      case "revert": {
        const day = trip.days[action.day];
        if (!day?.saved) return trip;
        return withDay(trip, action.day, {
          plan: day.saved,
          status: "finalized",
        });
      }

      case "setWindow": {
        const day = trip.days[action.day];
        if (!day) return trip;
        return withDay(trip, action.day, {
          window: action.window,
          status: day.status === "draft" ? "draft" : "editing",
        });
      }

      case "setDayArea":
        // Only records the pin. The traveler regenerates when ready, so a
        // pin never silently replaces Stops they were looking at.
        return trip.days[action.day]
          ? withDay(trip, action.day, { dayArea: action.city })
          : trip;

      case "toggleMustSee": {
        const { mustSees } = trip.prefs;
        return {
          ...trip,
          prefs: {
            ...trip.prefs,
            mustSees: mustSees.includes(action.placeId)
              ? mustSees.filter((id) => id !== action.placeId)
              : [...mustSees, action.placeId],
          },
        };
      }
    }
  };
  return reduce;
};

const inRange = (items: unknown[], index: number): boolean =>
  Number.isInteger(index) && index >= 0 && index < items.length;

/** Must-Sees that no day's plan contains yet, so the editor can say so (never silently dropped). */
export const unplannedMustSees = (trip: Trip): string[] => {
  const planned = new Set(
    trip.days.flatMap((d) => d.plan?.stops.map((s) => s.placeId) ?? []),
  );
  return trip.prefs.mustSees.filter((id) => !planned.has(id));
};
