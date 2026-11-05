import type { CleanPlace } from "../data/place.ts";
import { scheduleStops } from "../generator/generate-day.ts";
import type { Trip } from "../trip/trip.ts";
import { formatDate, formatTime } from "./format.ts";

type Props = { trip: Trip; places: CleanPlace[]; onReset: () => void };

/**
 * TEMPORARY (step 8b): a read-only look at the open day, so "Plan my trip"
 * has a visible result. Step 8c replaces this with the real editor.
 */
export const TripPreview = ({ trip, places, onReset }: Props) => {
  const placesById = new Map(places.map((p) => [p.id, p]));
  const day = trip.days[trip.openDay];
  const schedule = day.plan
    ? scheduleStops(day.plan.stops, {
        date: day.date,
        window: day.window,
        mode: trip.prefs.mode,
        placesById,
      })
    : null;

  return (
    <main className="preview">
      <h1>
        Day {trip.openDay + 1} · {formatDate(day.date)}
        {day.plan?.baseCity && ` · ${day.plan.baseCity}`}
      </h1>
      {schedule && schedule.stops.length > 0 ? (
        <ol className="preview__stops">
          {schedule.stops.map((s) => (
            <li key={s.placeId}>
              <span className="preview__time">
                {formatTime(s.start)}–{formatTime(s.end)}
              </span>{" "}
              {placesById.get(s.placeId)?.name}
            </li>
          ))}
        </ol>
      ) : (
        <p>No Stops yet.</p>
      )}
      <p className="field__hint">
        The full editor arrives in the next step. Your Trip is saved in this
        browser.
      </p>
      <button type="button" className="button" onClick={onReset}>
        Start over
      </button>
    </main>
  );
};
