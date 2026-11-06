import type { CleanPlace } from "../data/place.ts";
import { regenerateHint, travelLabel, warningText } from "../editor/copy.ts";
import {
  BASE_CITY_NAMES,
  baseCityOf,
  type BaseCity,
} from "../preferences/base-cities.ts";
import type { ScheduledDay } from "../schedule/schedule.ts";
import type { Trip, TripAction } from "../trip/trip.ts";
import { rulesFor } from "../availability/seasonal-notes.ts";
import { formatDate, formatTime, parseTimeInput } from "./format.ts";
import { StopCard } from "./StopCard.tsx";

type Props = {
  trip: Trip;
  index: number;
  schedule: ScheduledDay | null;
  placesById: Map<string, CleanPlace>;
  unplanned: string[];
  dispatch: (action: TripAction) => void;
  /** Shows the Place list and focuses its search (empty-day state). */
  onAddPlaces: () => void;
};

/** The open day: a header with every control, then the timed schedule (design doc §3.2). */
export const DayView = ({
  trip,
  index,
  schedule,
  placesById,
  unplanned,
  dispatch,
  onAddPlaces,
}: Props) => {
  const day = trip.days[index];
  const plan = day.plan;
  if (!plan || !schedule) return null;

  const warningCount = schedule.warningCount;
  const pinnedElsewhere =
    day.dayArea !== null &&
    plan.stops.length > 0 &&
    plan.baseCity !== day.dayArea;

  const setWindow = (edge: "start" | "end", value: string) => {
    const minutes = parseTimeInput(value);
    if (minutes === null) return;
    const window = { ...day.window, [edge]: minutes };
    if (window.end > window.start) {
      dispatch({ type: "setWindow", day: index, window });
    }
  };

  return (
    <section className="day" aria-labelledby="day-title">
      {/* Fixed at the top of the column; only .day__body below it scrolls. */}
      <header className="day__header">
        <h2 id="day-title">
          Day {index + 1} · {formatDate(day.date)}
        </h2>

        <div className="day__controls">
          <label className="control">
            <span className="control__label">City</span>
            <select
              value={day.dayArea ?? ""}
              onChange={(e) =>
                dispatch({
                  type: "setDayArea",
                  day: index,
                  city: (e.target.value || null) as BaseCity | null,
                })
              }
            >
              <option value="">
                {plan.baseCity
                  ? `${plan.baseCity} · chosen for you`
                  : "Choose for me"}
              </option>
              {BASE_CITY_NAMES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>

          <label className="control">
            <span className="control__label">Day starts</span>
            <input
              type="time"
              value={formatTime(day.window.start)}
              onChange={(e) => setWindow("start", e.target.value)}
            />
          </label>
          <label className="control">
            <span className="control__label">Day ends</span>
            <input
              type="time"
              value={formatTime(day.window.end)}
              onChange={(e) => setWindow("end", e.target.value)}
            />
          </label>
        </div>

        <p className="day__summary">
          {plan.stops.length} Stop{plan.stops.length === 1 ? "" : "s"} ·{" "}
          {warningCount} Warning{warningCount === 1 ? "" : "s"}
          {plan.stops.length > 0 && ` · ends ${formatTime(schedule.endsAt)}`}
        </p>

        <div className="day__buttons">
          <button
            type="button"
            className="button"
            title={regenerateHint(plan.stops)}
            onClick={() => dispatch({ type: "regenerate", day: index })}
          >
            ↻ {plan.stops.length === 0 ? "Suggest this day" : "Regenerate day"}
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => dispatch({ type: "finalize", day: index })}
          >
            ✓ Finalize day
            {warningCount > 0 &&
              ` · ${warningCount} Warning${warningCount === 1 ? "" : "s"}`}
          </button>
        </div>
        <p className="field__hint">{regenerateHint(plan.stops)}</p>
      </header>

      {/* The scrolling part, like the Place list's results: banners, then Stops. */}
      <div className="day__body">
        <div className="day__banners">
          {day.status === "finalized" && (
            <p className="banner banner--ok">
              ✓ Finalized. Changes reopen it for editing.
            </p>
          )}
          {day.status === "editing" && day.saved && (
            <p className="banner">
              Finalized earlier. Your changes save when you finalize again.{" "}
              <button
                type="button"
                className="button button--link"
                onClick={() => dispatch({ type: "revert", day: index })}
              >
                Revert to saved
              </button>
            </p>
          )}
          {pinnedElsewhere && (
            <p className="banner">
              This day is now pinned to {day.dayArea}, but its Stops are in{" "}
              {plan.baseCity}.{" "}
              <button
                type="button"
                className="button button--link"
                onClick={() => dispatch({ type: "regenerate", day: index })}
              >
                Regenerate day
              </button>
            </p>
          )}
          {unplanned.length > 0 && (
            <p className="banner">
              Must-Sees not planned yet:{" "}
              {unplanned
                .map((id) => {
                  const place = placesById.get(id);
                  return place ? `${place.name} (${baseCityOf(place)})` : id;
                })
                .join(", ")}
              .
            </p>
          )}
        </div>

        {plan.stops.length === 0 ? (
          <div className="empty">
            <p>Day {index + 1} has no Stops yet.</p>
            {/* Two equal choices (design doc §3.9). */}
            <div className="day__buttons empty__actions">
              <button
                type="button"
                className="button"
                onClick={() => dispatch({ type: "regenerate", day: index })}
              >
                ↻ Suggest this day
              </button>
              <button type="button" className="button" onClick={onAddPlaces}>
                Add places →
              </button>
            </div>
          </div>
        ) : (
          <ol className="stops">
            {schedule.stops.map((scheduled, i) => {
              const place = placesById.get(scheduled.placeId)!;
              const travelWarning = scheduled.warnings.find(
                (w) => w.kind === "long-travel",
              );
              return (
                <li key={scheduled.placeId}>
                  {scheduled.travel && (
                    <p
                      className={`connector${travelWarning ? " connector--warning" : ""}`}
                    >
                      {travelLabel(scheduled.travel)}
                      {travelWarning && (
                        <>
                          {" "}
                          <span aria-hidden="true">!</span>{" "}
                          {warningText(travelWarning, {
                            date: day.date,
                            rules: rulesFor(place.id),
                          })}
                        </>
                      )}
                    </p>
                  )}
                  <StopCard
                    number={i + 1}
                    place={place}
                    planned={plan.stops[i]}
                    scheduled={scheduled}
                    date={day.date}
                    prefs={trip.prefs}
                    isFirst={i === 0}
                    isLast={i === schedule.stops.length - 1}
                    onMoveUp={() =>
                      dispatch({
                        type: "moveStop",
                        day: index,
                        from: i,
                        to: i - 1,
                      })
                    }
                    onMoveDown={() =>
                      dispatch({
                        type: "moveStop",
                        day: index,
                        from: i,
                        to: i + 1,
                      })
                    }
                    onRemove={() =>
                      dispatch({ type: "removeStop", day: index, index: i })
                    }
                  />
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
};
