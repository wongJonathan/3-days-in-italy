import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Stack,
  Typography,
} from "@mui/material";
import { countLabel } from "../../utils/editor/copy.ts";
import { tuneSummary } from "../../utils/onboarding/onboarding.ts";
import type { ScheduledDay } from "../../utils/schedule/schedule.ts";
import {
  isTripFinalized,
  type DayStatus,
  type Trip,
} from "../../stores/trip.ts";
import { formatDate } from "../../utils/format.ts";

type Props = {
  trip: Trip;
  schedules: (ScheduledDay | null)[];
  onOpen: (day: number) => void;
  /** Asks to delete the Trip and start a new one (App confirms first). */
  onReset: () => void;
  /** Opens the Trip Overview; only enabled once every day is finalized. */
  onViewTrip: () => void;
};

/** Shape + word, not colour alone (WCAG 1.4.1): ○ draft, ▶ editing, ✓ finalized. */
const STATUS: Record<DayStatus, { icon: string; label: string }> = {
  draft: { icon: "○", label: "draft" },
  editing: { icon: "▶", label: "editing" },
  finalized: { icon: "✓", label: "finalized" },
};

const VIEW_HINT_ID = "view-trip-hint";

/** The whole Trip at a glance: one card per day (design doc §3.2). */
export const TripPanel = ({
  trip,
  schedules,
  onOpen,
  onReset,
  onViewTrip,
}: Props) => {
  const allFinalized = isTripFinalized(trip);
  const first = trip.days[0].date;
  const last = trip.days[trip.days.length - 1].date;

  return (
    <nav className="trip-panel" aria-label="Trip days">
      <Typography component="h2" variant="h6">
        Your trip
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {formatDate(first)} – {formatDate(last)}
        <br />
        {tuneSummary(trip.prefs)}
      </Typography>
      {allFinalized && (
        <Alert severity="success" role="status" sx={{ mt: 1 }}>
          Trip ready
        </Alert>
      )}

      {/* .day-cards keeps the narrow-screen rule that puts the 3 cards side by side. */}
      <Box
        component="ul"
        className="day-cards"
        sx={{ listStyle: "none", m: 0, my: 1.5, p: 0, display: "grid", gap: 1 }}
      >
        {trip.days.map((day, i) => {
          const schedule = schedules[i];
          const status = STATUS[day.status];
          const open = trip.openDay === i;
          return (
            <li key={day.date}>
              <Card
                variant="outlined"
                sx={{
                  borderColor: open ? "primary.main" : "divider",
                  boxShadow: open ? "inset 3px 0 0 var(--accent)" : "none",
                }}
              >
                <CardActionArea
                  aria-current={open ? "true" : undefined}
                  onClick={() => onOpen(i)}
                  sx={{ px: 1.5, py: 1.25 }}
                >
                  <Typography sx={{ fontWeight: 600 }}>
                    <span aria-hidden="true">{status.icon}</span> Day {i + 1} ·{" "}
                    {formatDate(day.date)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {day.plan
                      ? [
                          day.plan.baseCity ?? "No city yet",
                          countLabel(day.plan.stops.length, "Stop"),
                          schedule && schedule.warningCount > 0
                            ? `! ${countLabel(schedule.warningCount, "Warning")}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "Not planned yet"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {status.label}
                  </Typography>
                </CardActionArea>
              </Card>
            </li>
          );
        })}
      </Box>

      <Stack spacing={0.5} sx={{ alignItems: "flex-start" }}>
        <Button
          variant="outlined"
          onClick={onViewTrip}
          disabled={!allFinalized}
          aria-describedby={allFinalized ? undefined : VIEW_HINT_ID}
        >
          View trip
        </Button>
        {/* A disabled button can't show a tooltip, so the hint is plain text. */}
        {!allFinalized && (
          <Typography id={VIEW_HINT_ID} variant="body2" color="text.secondary">
            Finalize all {trip.days.length} days to view your trip.
          </Typography>
        )}
        <Button variant="text" onClick={onReset}>
          Plan a new trip
        </Button>
      </Stack>
    </nav>
  );
};
