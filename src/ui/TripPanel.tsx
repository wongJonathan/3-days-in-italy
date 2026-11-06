// EXPERIMENT (branch experiment/mui-place-list): MUI version.
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Stack,
  Typography,
} from "@mui/material";
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
                          `${day.plan.stops.length} Stops`,
                          schedule && schedule.warningCount > 0
                            ? `! ${schedule.warningCount} Warning${schedule.warningCount === 1 ? "" : "s"}`
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

      <Stack direction="row">
        <Button variant="text" onClick={onReset}>
          Start over
        </Button>
      </Stack>
    </nav>
  );
};
