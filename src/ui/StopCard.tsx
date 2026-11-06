// The Stop card, built with MUI components.
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef } from "react";
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
  /** The last clicked card: highlighted until another card is clicked. */
  selected: boolean;
  onSelect: () => void;
  /** Set on the card just moved with ↑ / ↓ (see Refocus). */
  refocus: Refocus | null;
};

/**
 * After a move, React re-orders the cards on the page, and a browser can drop
 * keyboard focus from a moved element. So the moved card puts focus back on
 * the arrow that was pressed, and scrolls into view. `token` changes on every
 * move, so pressing ↑ twice does it twice.
 */
export type Refocus = { direction: "up" | "down"; token: number };

const MAX_CHIPS = 3;

/** True when the traveler asked their system for less motion. */
const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  selected,
  onSelect,
  refocus,
}: Props) => {
  const cardRef = useRef<HTMLElement>(null);
  const upRef = useRef<HTMLButtonElement>(null);
  const downRef = useRef<HTMLButtonElement>(null);

  // Runs after React has put the card in its new place. It reads plain values
  // (not the `refocus` object, which is new on every render), and those change
  // only when a new move happens, so it runs once per move.
  const token = refocus?.token;
  const direction = refocus?.direction;
  useEffect(() => {
    if (token === undefined) return;
    // Focus the arrow that was pressed, so ↑ ↑ ↑ keeps moving the same Stop.
    // At the top or bottom that arrow is disabled: use the other one.
    const pressed = direction === "up" ? upRef : downRef;
    const other = direction === "up" ? downRef : upRef;
    const target = pressed.current?.disabled ? other : pressed;
    target.current?.focus({ preventScroll: true });
  }, [token, direction]);

  // Whenever this card becomes selected (a click, a move, or just added from
  // the Place list), bring it into view. "nearest" does nothing if it's
  // already visible, so clicking a card never makes the list jump.
  // The token makes a move re-check, since the card may have scrolled away.
  useEffect(() => {
    if (!selected) return;
    cardRef.current?.scrollIntoView({
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [selected, token]);

  const chips = chipsFor(scorePlace(place, prefs));
  // Travel Warnings are shown on the connector above the card instead.
  const warnings = scheduled.warnings.filter((w) => w.kind !== "long-travel");
  const visitMinutes = scheduled.end - scheduled.start;

  return (
    <Card
      ref={cardRef}
      component="article"
      variant="outlined"
      aria-label={`Stop ${number}: ${place.name}`}
      // Clicking anywhere on the card (including its buttons) selects it.
      onClick={onSelect}
      sx={{
        p: 1.5,
        // Selected: the same look as the open day in the Trip panel.
        borderColor: selected ? "primary.main" : "divider",
        boxShadow: selected ? "inset 3px 0 0 var(--accent)" : "none",
      }}
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
          ref={upRef}
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label={`Move ${place.name} up`}
        >
          ↑
        </Button>
        <Button
          size="small"
          variant="outlined"
          ref={downRef}
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
