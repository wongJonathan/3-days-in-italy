import type { CleanPlace } from "../data/place.ts";
import {
  formatDuration,
  hoursLabel,
  reasonLabel,
  warningText,
} from "../editor/copy.ts";
import type { PlannedStop } from "../generator/generate-day.ts";
import type { IsoDate } from "../hours/calendar.ts";
import { rulesFor } from "../availability/seasonal-notes.ts";
import type { ScheduledStop } from "../schedule/schedule.ts";
import {
  chipsFor,
  scorePlace,
  type ScoringPreferences,
} from "../scoring/score.ts";
import { formatTime } from "./format.ts";

type Props = {
  number: number;
  place: CleanPlace;
  planned: PlannedStop;
  scheduled: ScheduledStop;
  date: IsoDate;
  prefs: ScoringPreferences;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
};

const MAX_CHIPS = 3;

/** One Stop: time and name, labels, "why" chips, Warnings, actions (design doc §3.3). */
export const StopCard = ({
  number,
  place,
  planned,
  scheduled,
  date,
  prefs,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
}: Props) => {
  const chips = chipsFor(scorePlace(place, prefs));
  // Travel Warnings are shown on the connector above the card instead.
  const warnings = scheduled.warnings.filter((w) => w.kind !== "long-travel");
  const visitMinutes = scheduled.end - scheduled.start;

  return (
    <article className="stop" aria-label={`Stop ${number}: ${place.name}`}>
      <header className="stop__head">
        <span className="stop__number" aria-hidden="true">
          {number}
        </span>
        <span className="stop__time">
          {formatTime(scheduled.start)}–{formatTime(scheduled.end)}
        </span>
        <h3 className="stop__name">{place.name}</h3>
      </header>

      <p className="stop__labels">
        {planned.origin === "must-see" && (
          <span className="tag tag--kept">★ Must-See</span>
        )}
        {planned.origin === "added" && (
          <span className="tag tag--kept">Added by you</span>
        )}
        {planned.meal && (
          <span className="tag">
            {planned.meal === "lunch" ? "Lunch" : "Dinner"}
          </span>
        )}
        <span className="tag tag--quiet">
          {hoursLabel(place, scheduled.availability)}
        </span>
        <span className="tag tag--quiet">{formatDuration(visitMinutes)}</span>
        {scheduled.start > scheduled.arrive && (
          <span className="tag tag--quiet">
            Arrive {formatTime(scheduled.arrive)}, starts{" "}
            {formatTime(scheduled.start)}
          </span>
        )}
      </p>

      {chips.length > 0 && (
        <p className="stop__why">
          why: {chips.slice(0, MAX_CHIPS).map(reasonLabel).join(" · ")}
          {chips.length > MAX_CHIPS && ` · +${chips.length - MAX_CHIPS}`}
        </p>
      )}

      {warnings.length > 0 && (
        <ul className="warnings">
          {warnings.map((w) => (
            <li key={w.kind} className="warning">
              <span aria-hidden="true">!</span>{" "}
              {warningText(w, { date, rules: rulesFor(place.id) })}
            </li>
          ))}
        </ul>
      )}

      <div className="stop__actions">
        <button
          type="button"
          className="button button--small"
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label={`Move ${place.name} up`}
        >
          ↑
        </button>
        <button
          type="button"
          className="button button--small"
          onClick={onMoveDown}
          disabled={isLast}
          aria-label={`Move ${place.name} down`}
        >
          ↓
        </button>
        <button
          type="button"
          className="button button--small"
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
    </article>
  );
};
