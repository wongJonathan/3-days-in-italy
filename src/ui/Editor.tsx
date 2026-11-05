import { lazy, Suspense, useMemo, useSyncExternalStore } from "react";
import type { CleanPlace } from "../data/place.ts";
import { dayMapModel } from "../editor/map-model.ts";
import { scheduleStops } from "../generator/generate-day.ts";
import { unplannedMustSees, type Trip, type TripAction } from "../trip/trip.ts";
import { DayView } from "./DayView.tsx";
import { PlaceList } from "./PlaceList.tsx";
import { TripPanel } from "./TripPanel.tsx";

/**
 * Leaflet is loaded as a separate file, after the editor appears, so it
 * doesn't slow the first screen down.
 */
const DayMap = lazy(() => import("./DayMap.tsx"));

/** Being in a browser never changes, so there is nothing to subscribe to. */
const noSubscription = () => () => {};

type Props = {
  trip: Trip;
  places: CleanPlace[];
  dispatch: (action: TripAction) => void;
  onReset: () => void;
};

/**
 * The editor: Trip panel | open day | map and Place list.
 * Schedules are recomputed from the Trip on every render. The scheduler is
 * pure and fast, so there is no stored copy of times that could go stale.
 */
export const Editor = ({ trip, places, dispatch, onReset }: Props) => {
  const placesById = useMemo(
    () => new Map(places.map((p) => [p.id, p])),
    [places],
  );
  const schedules = trip.days.map((day) =>
    day.plan
      ? scheduleStops(day.plan.stops, {
          date: day.date,
          window: day.window,
          mode: trip.prefs.mode,
          placesById,
        })
      : null,
  );

  // The map needs a real browser (Leaflet uses `window`). During server
  // rendering (the Node smoke tests) the third function answers instead,
  // so Leaflet is never loaded there.
  const inBrowser = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );

  const mapPlaceholder = (
    <div className="map map--placeholder">Loading map…</div>
  );

  return (
    <div className="editor">
      <TripPanel
        trip={trip}
        schedules={schedules}
        onOpen={(day) => dispatch({ type: "openDay", day })}
        onReset={onReset}
      />
      <DayView
        trip={trip}
        index={trip.openDay}
        schedule={schedules[trip.openDay]}
        placesById={placesById}
        unplanned={unplannedMustSees(trip)}
        dispatch={dispatch}
      />
      <aside className="editor__side" aria-label="Map and places">
        {inBrowser ? (
          <Suspense fallback={mapPlaceholder}>
            <DayMap
              model={dayMapModel(
                trip,
                trip.openDay,
                schedules[trip.openDay],
                placesById,
              )}
              label={`Map of Day ${trip.openDay + 1}`}
            />
          </Suspense>
        ) : (
          mapPlaceholder
        )}
        <PlaceList trip={trip} places={places} dispatch={dispatch} />
      </aside>
    </div>
  );
};
