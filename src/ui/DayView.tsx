// EXPERIMENT (branch experiment/mui-place-list): the day view rebuilt with MUI
// components. Same content and actions as main; only the markup differs.
// The layout classes (day, day__header, day__body, day__buttons, connector)
// are kept so the column scrolling and narrow-screen rules still apply.
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { rulesFor } from "../availability/seasonal-notes.ts";
import type { CleanPlace } from "../data/place.ts";
import { regenerateHint, travelLabel, warningText } from "../editor/copy.ts";
import {
  BASE_CITY_NAMES,
  baseCityOf,
  type BaseCity,
} from "../preferences/base-cities.ts";
import type { ScheduledDay } from "../schedule/schedule.ts";
import type { Trip, TripAction } from "../trip/trip.ts";
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

  const regenerate = () => dispatch({ type: "regenerate", day: index });

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
          {plan.stops.length} Stop{plan.stops.length === 1 ? "" : "s"} ·{" "}
          {warningCount} Warning{warningCount === 1 ? "" : "s"}
          {plan.stops.length > 0 && ` · ends ${formatTime(schedule.endsAt)}`}
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          className="day__buttons"
          sx={{ flexWrap: "wrap" }}
        >
          <Button
            variant="outlined"
            title={regenerateHint(plan.stops)}
            onClick={regenerate}
          >
            ↻ {plan.stops.length === 0 ? "Suggest this day" : "Regenerate day"}
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={() => dispatch({ type: "finalize", day: index })}
          >
            ✓ Finalize day
            {warningCount > 0 &&
              ` · ${warningCount} Warning${warningCount === 1 ? "" : "s"}`}
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          {regenerateHint(plan.stops)}
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
          <Box
            sx={{
              mt: 2,
              p: 3,
              border: 1,
              borderStyle: "dashed",
              borderColor: "divider",
              borderRadius: 1,
              textAlign: "center",
            }}
          >
            <Typography sx={{ mb: 1 }}>
              Day {index + 1} has no Stops yet.
            </Typography>
            {/* Two equal choices (design doc §3.9). */}
            <Stack
              direction="row"
              spacing={1}
              sx={{ justifyContent: "center" }}
            >
              <Button variant="outlined" onClick={regenerate}>
                ↻ Suggest this day
              </Button>
              <Button variant="outlined" onClick={onAddPlaces}>
                Add places →
              </Button>
            </Stack>
          </Box>
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
          </Box>
        )}
      </div>
    </section>
  );
};
