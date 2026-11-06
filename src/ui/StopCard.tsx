// EXPERIMENT (branch experiment/mui-place-list): the Stop card rebuilt with
// MUI components. Same content and actions as main; only the markup differs.
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { rulesFor } from "../availability/seasonal-notes.ts";
import type { CleanPlace } from "../data/place.ts";
import {
  formatDuration,
  hoursLabel,
  reasonLabel,
  warningText,
} from "../editor/copy.ts";
import type { PlannedStop } from "../generator/generate-day.ts";
import type { IsoDate } from "../hours/calendar.ts";
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
    <Card
      component="article"
      variant="outlined"
      aria-label={`Stop ${number}: ${place.name}`}
      sx={{ p: 1.5 }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "baseline", flexWrap: "wrap" }}
      >
        {/* The number matches the map pin. */}
        <Box
          aria-hidden="true"
          sx={{
            display: "inline-grid",
            placeItems: "center",
            width: 26,
            height: 26,
            borderRadius: "50%",
            bgcolor: "primary.main",
            color: "primary.contrastText",
            fontSize: "0.8125rem",
            fontWeight: 700,
          }}
        >
          {number}
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatTime(scheduled.start)}–{formatTime(scheduled.end)}
        </Typography>
        <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 600 }}>
          {place.name}
        </Typography>
      </Stack>

      <Stack
        direction="row"
        spacing={0.75}
        useFlexGap
        sx={{ flexWrap: "wrap", mt: 1 }}
      >
        {planned.origin === "must-see" && (
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            label="★ Must-See"
          />
        )}
        {planned.origin === "added" && (
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            label="Added by you"
          />
        )}
        {planned.meal && (
          <Chip
            size="small"
            variant="outlined"
            label={planned.meal === "lunch" ? "Lunch" : "Dinner"}
          />
        )}
        {/* Hours Status and duration: quieter than Warnings (design doc §3.6). */}
        <Chip
          size="small"
          variant="outlined"
          sx={{ color: "text.secondary" }}
          label={hoursLabel(place, scheduled.availability)}
        />
        <Chip
          size="small"
          variant="outlined"
          sx={{ color: "text.secondary" }}
          label={formatDuration(visitMinutes)}
        />
        {scheduled.start > scheduled.arrive && (
          <Chip
            size="small"
            variant="outlined"
            sx={{ color: "text.secondary" }}
            label={`Arrive ${formatTime(scheduled.arrive)}, starts ${formatTime(scheduled.start)}`}
          />
        )}
      </Stack>

      {chips.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          why: {chips.slice(0, MAX_CHIPS).map(reasonLabel).join(" · ")}
          {chips.length > MAX_CHIPS && ` · +${chips.length - MAX_CHIPS}`}
        </Typography>
      )}

      {warnings.length > 0 && (
        <Stack
          component="ul"
          spacing={0.5}
          sx={{ listStyle: "none", m: 0, mt: 1, p: 0 }}
        >
          {warnings.map((w) => (
            <li key={w.kind}>
              {/* role="note": MUI's default role="alert" would interrupt a
                  screen reader every time the schedule redraws. */}
              <Alert
                severity="warning"
                role="note"
                icon={<span aria-hidden="true">!</span>}
                sx={{ py: 0 }}
              >
                {warningText(w, { date, rules: rulesFor(place.id) })}
              </Alert>
            </li>
          ))}
        </Stack>
      )}

      <Stack direction="row" spacing={0.75} sx={{ mt: 1.25 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label={`Move ${place.name} up`}
        >
          ↑
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={onMoveDown}
          disabled={isLast}
          aria-label={`Move ${place.name} down`}
        >
          ↓
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          onClick={onRemove}
        >
          Remove
        </Button>
      </Stack>
    </Card>
  );
};
