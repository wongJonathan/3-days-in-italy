import { tuneSummary } from "../onboarding/onboarding.ts";
import type { ScheduledDay } from "../schedule/schedule.ts";
import type { DayStatus, Trip } from "../trip/trip.ts";
import { formatDate } from "./format.ts";

type Props = {
  trip: Trip;
  schedules: (ScheduledDay | null)[];
  onOpen: (day: number) => void;
  onReset: () => void;
};

/** Shape + word, not colour alone (WCAG 1.4.1): ○ draft, ▶ editing, ✓ finalized. */
const STATUS: Record<DayStatus, { icon: string; label: string }> = {
  draft: { icon: "○", label: "draft" },
  editing: { icon: "▶", label: "editing" },
  finalized: { icon: "✓", label: "finalized" },
};

/** The whole Trip at a glance: one card per day (design doc §3.2). */
export const TripPanel = ({ trip, schedules, onOpen, onReset }: Props) => {
  const allFinalized = trip.days.every((d) => d.status === "finalized");
  const first = trip.days[0].date;
  const last = trip.days[trip.days.length - 1].date;

  return (
    <nav className="trip-panel" aria-label="Trip days">
      <h2 className="trip-panel__title">Your trip</h2>
      <p className="field__hint">
        {formatDate(first)} – {formatDate(last)}
        <br />
        {tuneSummary(trip.prefs)}
      </p>
      {allFinalized && <p className="banner banner--ok">✓ Trip ready</p>}

      <ul className="day-cards">
        {trip.days.map((day, i) => {
          const schedule = schedules[i];
          const status = STATUS[day.status];
          return (
            <li key={day.date}>
              <button
                type="button"
                className={`day-card${trip.openDay === i ? " day-card--open" : ""}`}
                aria-current={trip.openDay === i ? "true" : undefined}
                onClick={() => onOpen(i)}
              >
                <span className="day-card__title">
                  <span aria-hidden="true">{status.icon}</span> Day {i + 1} ·{" "}
                  {formatDate(day.date)}
                </span>
                <span className="day-card__meta">
                  {day.plan
                    ? [
                        day.plan.baseCity ?? "No city yet",
                        `${day.plan.stops.length} Stops`,
                        schedule && schedule.warningCount > 0
                          ? `! ${schedule.warningCount} Warning${schedule.warningCount === 1 ? "" : "s"}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "Not planned yet"}
                </span>
                <span className="day-card__status">{status.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <button type="button" className="button button--link" onClick={onReset}>
        Start over
      </button>
    </nav>
  );
};
