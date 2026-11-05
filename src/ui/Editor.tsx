import { useMemo } from "react";
import type { CleanPlace } from "../data/place.ts";
import { scheduleStops } from "../generator/generate-day.ts";
import { unplannedMustSees, type Trip, type TripAction } from "../trip/trip.ts";
import { DayView } from "./DayView.tsx";
import { PlaceList } from "./PlaceList.tsx";
import { TripPanel } from "./TripPanel.tsx";

type Props = {
  trip: Trip;
  places: CleanPlace[];
  dispatch: (action: TripAction) => void;
  onReset: () => void;
};

/**
 * The editor: Trip panel | open day | Place list (the map arrives in 8e).
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
      <aside className="editor__side" aria-label="Places">
        <PlaceList trip={trip} places={places} dispatch={dispatch} />
      </aside>
    </div>
  );
};
