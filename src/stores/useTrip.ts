import { useEffect, useMemo, useState } from "react";
import type { CleanPlace } from "../utils/data/place.ts";
import { canUseStorage, parseTrip, saveTrip, STORAGE_KEY } from "./storage.ts";
import {
  createTrip,
  tripReducer,
  type NewTrip,
  type Trip,
  type TripAction,
} from "./trip.ts";

/** localStorage, or undefined where even reading it throws (some privacy modes). */
const browserStorage = (): Storage | undefined => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

/**
 * The Trip, kept in React state and saved to localStorage after every change.
 * All the logic lives in tripReducer and storage.ts (tested); this hook only
 * connects them to React and the browser.
 */
export const useTrip = (places: CleanPlace[]) => {
  const reduce = useMemo(() => tripReducer(places), [places]);

  const [storage] = useState(() => {
    const s = browserStorage();
    return canUseStorage(s) ? s : undefined;
  });
  const [loaded] = useState(() =>
    storage
      ? parseTrip(
          storage.getItem(STORAGE_KEY),
          new Set(places.map((p) => p.id)),
        )
      : null,
  );
  const [trip, setTrip] = useState<Trip | null>(loaded?.trip ?? null);
  // The last save worked. Starts true: canUseStorage already tried a write.
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    if (!storage) return;
    // Syncing with an external system (localStorage) and keeping its result is
    // what effects are for. React skips the re-render while the value stays true.
    // oxlint-disable-next-line react/set-state-in-effect
    setSaved(saveTrip(storage, trip));
  }, [storage, trip]);

  return {
    trip,
    dispatch: (action: TripAction) =>
      setTrip((current) => (current ? reduce(current, action) : current)),
    start: (newTrip: NewTrip) => setTrip(createTrip(newTrip, places)),
    /** Forgets the Trip and goes back to onboarding. */
    reset: () => setTrip(null),
    /** False in private mode or with a full quota: the Trip won't survive a reload. */
    canSave: storage !== undefined && saved,
    /** Stops dropped on load because their Place left the data. */
    removedStops: loaded?.removedStops ?? 0,
  };
};
