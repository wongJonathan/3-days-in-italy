// The layout classes (day, day__header, day__body, day__buttons, connector)
// are kept so the column scrolling and narrow-screen rules in index.css apply.
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { rulesFor } from "../../utils/availability/seasonal-notes.ts";
import type { CleanPlace } from "../../utils/data/place.ts";
import {
  countLabel,
  regenerateHint,
  travelLabel,
  warningText,
} from "../../utils/editor/copy.ts";
import { moveAnnouncement } from "../../utils/editor/move-feedback.ts";
import { scheduleStops } from "../../utils/generator/generate-day.ts";
import {
  BASE_CITY_NAMES,
  baseCityOf,
  type BaseCity,
} from "../../utils/preferences/base-cities.ts";
import type { ScheduledDay } from "../../utils/schedule/schedule.ts";
import type { Trip, TripAction } from "../../stores/trip.ts";
import { formatDate, formatTime, parseTimeInput } from "../../utils/format.ts";
import { EmptyState } from "../EmptyState/EmptyState.tsx";
import { StopCard } from "./StopCard.tsx";

/** The last ↑ / ↓ move, worked out when it was clicked (see `move`). */
type LastMove = {
  dayIndex: number;
  placeId: string;
  direction: "up" | "down";
  /** Changes on every move, so the moved card refocuses every time. */
  token: number;
  announcement: string;
};

type Props = {
  trip: Trip;
  index: number;
  schedule: ScheduledDay | null;
  placesById: Map<string, CleanPlace>;
  unplanned: string[];
  dispatch: (action: TripAction) => void;
  /** Shows the Place list and focuses its search (empty-day state). */
  onAddPlaces: () => void;
  /**
   * The selected Stop on this day (or null). The selection lives in EditorPage,
   * so the Place list can select a Stop it has just added.
   */
  selectedId: string | null;
  onSelect: (placeId: string) => void;
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
  selectedId,
  onSelect,
}: Props) => {
  const [lastMove, setLastMove] = useState<LastMove | null>(null);

  const day = trip.days[index];
  const plan = day.plan;
  if (!plan || !schedule) return null;

  /**
   * Moves a Stop and records it, so the moved card can keep keyboard focus
   * and the move can be read out. The new times are worked out here with the
   * same `scheduleStops` the editor uses, so they match what will be shown.
   */
  const move = (from: number, direction: "up" | "down") => {
    const to = direction === "up" ? from - 1 : from + 1;
    const reordered = [...plan.stops];
    reordered.splice(to, 0, ...reordered.splice(from, 1));
    const next = scheduleStops(reordered, {
      date: day.date,
      window: day.window,
      mode: trip.prefs.mode,
      placesById,
    });
    const placeId = plan.stops[from].placeId;
    const moved = next.stops[to];

    setLastMove({
      dayIndex: index,
      placeId,
      direction,
      token: (lastMove?.token ?? 0) + 1,
      announcement: moveAnnouncement({
        name: placesById.get(placeId)?.name ?? placeId,
        direction,
        position: to + 1,
        total: next.stops.length,
        start: moved.start,
        end: moved.end,
      }),
    });
    dispatch({ type: "moveStop", day: index, from, to });
  };

  const refocusFor = (placeId: string) =>
    lastMove?.dayIndex === index && lastMove.placeId === placeId
      ? { direction: lastMove.direction, token: lastMove.token }
      : null;

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

  const regenerate = () => dispatch({ type: "regenerate", day: index });
  // Shown twice: as the button's tooltip and as the line under the buttons.
  const hint = regenerateHint(plan.stops);

  return (
    <section className="day" aria-labelledby="day-title">
      {/* Fixed at the top of the column; only .day__body below it scrolls. */}
      <header className="day__header">
        <Typography id="day-title" component="h2" variant="h5" sx={{ mb: 1.5 }}>
          Day {index + 1} · {formatDate(day.date)}
        </Typography>

        <Stack
          direction="row"
          spacing={1.5}
          useFlexGap
          sx={{ flexWrap: "wrap", mb: 1 }}
        >
          {/* Native select: works best with screen readers and phone keyboards. */}
          <TextField
            select
            size="small"
            label="City"
            value={day.dayArea ?? ""}
            onChange={(e) =>
              dispatch({
                type: "setDayArea",
                day: index,
                city: (e.target.value || null) as BaseCity | null,
              })
            }
            slotProps={{
              select: { native: true },
              inputLabel: { shrink: true },
            }}
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
          </TextField>
          <TextField
            type="time"
            size="small"
            label="Day starts"
            value={formatTime(day.window.start)}
            onChange={(e) => setWindow("start", e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            type="time"
            size="small"
            label="Day ends"
            value={formatTime(day.window.end)}
            onChange={(e) => setWindow("end", e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>

        <Typography sx={{ fontWeight: 600, my: 1 }}>
          {countLabel(plan.stops.length, "Stop")} ·{" "}
          {countLabel(warningCount, "Warning")}
          {plan.stops.length > 0 && ` · ends ${formatTime(schedule.endsAt)}`}
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          className="day__buttons"
          sx={{ flexWrap: "wrap" }}
        >
          <Button variant="outlined" title={hint} onClick={regenerate}>
            ↻ {plan.stops.length === 0 ? "Suggest this day" : "Regenerate day"}
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={() => dispatch({ type: "finalize", day: index })}
          >
            ✓ Finalize day
            {warningCount > 0 && ` · ${countLabel(warningCount, "Warning")}`}
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          {hint}
        </Typography>
      </header>

      {/* The scrolling part, like the Place list's results: banners, then Stops. */}
      <div className="day__body">
        {/* role="status": announced politely, without interrupting (MUI's default is role="alert"). */}
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          {day.status === "finalized" && (
            <Alert severity="success" role="status">
              Finalized. Changes reopen it for editing.
            </Alert>
          )}
          {day.status === "editing" && day.saved && (
            <Alert
              severity="info"
              role="status"
              action={
                <Button
                  size="small"
                  onClick={() => dispatch({ type: "revert", day: index })}
                >
                  Revert to saved
                </Button>
              }
            >
              Finalized earlier. Your changes save when you finalize again.
            </Alert>
          )}
          {pinnedElsewhere && (
            <Alert
              severity="info"
              role="status"
              action={
                <Button size="small" onClick={regenerate}>
                  Regenerate day
                </Button>
              }
            >
              This day is now pinned to {day.dayArea}, but its Stops are in{" "}
              {plan.baseCity}.
            </Alert>
          )}
          {unplanned.length > 0 && (
            <Alert severity="info" role="status">
              Must-Sees not planned yet:{" "}
              {unplanned
                .map((id) => {
                  const place = placesById.get(id);
                  return place ? `${place.name} (${baseCityOf(place)})` : id;
                })
                .join(", ")}
              .
            </Alert>
          )}
        </Stack>

        {plan.stops.length === 0 ? (
          // Two equal choices (design doc §3.9).
          <EmptyState message={`Day ${index + 1} has no Stops yet.`}>
            <Button variant="outlined" onClick={regenerate}>
              ↻ Suggest this day
            </Button>
            <Button variant="outlined" onClick={onAddPlaces}>
              Add places →
            </Button>
          </EmptyState>
        ) : (
          <Box component="ol" sx={{ listStyle: "none", m: 0, mt: 2, p: 0 }}>
            {schedule.stops.map((scheduled, i) => {
              const place = placesById.get(scheduled.placeId)!;
              const travelWarning = scheduled.warnings.find(
                (w) => w.kind === "long-travel",
              );
              return (
                <li key={scheduled.placeId}>
                  {scheduled.travel && (
                    // The dashed "connector" line between cards stays plain CSS.
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
                    onMoveUp={() => move(i, "up")}
                    onMoveDown={() => move(i, "down")}
                    onRemove={() =>
                      dispatch({ type: "removeStop", day: index, index: i })
                    }
                    selected={selectedId === scheduled.placeId}
                    onSelect={() => onSelect(scheduled.placeId)}
                    refocus={refocusFor(scheduled.placeId)}
                  />
                </li>
              );
            })}
          </Box>
        )}
      </div>

      {/* Read out after each move: "Pantheon moved up to stop 2 of 5, now 11:19–12:04." */}
      <p className="visually-hidden" aria-live="polite">
        {lastMove?.dayIndex === index ? lastMove.announcement : ""}
      </p>
    </section>
  );
};
