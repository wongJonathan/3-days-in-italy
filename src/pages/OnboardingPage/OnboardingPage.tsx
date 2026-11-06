import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  FormControlLabel,
  FormGroup,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import type { CleanPlace } from "../../utils/data/place.ts";
import type { IsoDate } from "../../utils/hours/calendar.ts";
import {
  cityCounts,
  headsUps,
  headsUpText,
  isPastDate,
  tripDates,
  tuneSummary,
} from "../../utils/onboarding/onboarding.ts";
import { BASE_CITY_NAMES } from "../../utils/preferences/base-cities.ts";
import { INTERESTS, interestLabel } from "../../utils/preferences/interests.ts";
import {
  DEFAULT_PREFERENCES,
  type Pace,
  type Preferences,
} from "../../utils/preferences/preferences.ts";
import type { PriceLevel } from "../../utils/scoring/budget.ts";
import type { TransportMode } from "../../utils/travel/travel-time.ts";
import type { NewTrip } from "../../stores/trip.ts";
import { formatDate } from "../../utils/format.ts";

type Props = {
  places: CleanPlace[];
  /** Today's date in Rome; Start Dates before it are blocked. */
  today: IsoDate;
  onStart: (trip: NewTrip) => void;
};

const PACES: { value: Pace; label: string; hint: string }[] = [
  { value: "relaxed", label: "Relaxed", hint: "3 sights a day" },
  { value: "balanced", label: "Balanced", hint: "4 sights a day" },
  { value: "packed", label: "Packed", hint: "6 sights a day" },
];

/** "any" stands for "no Budget" (null): toggle buttons need a string value. */
const BUDGETS: { value: PriceLevel | "any"; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "€", label: "€" },
  { value: "€€", label: "€€" },
  { value: "€€€", label: "€€€" },
  { value: "€€€€", label: "€€€€" },
];

const MODES: { value: TransportMode; label: string }[] = [
  { value: "public-transport", label: "Public transport" },
  { value: "rental-car", label: "Rental car" },
];

/**
 * The segmented buttons for Pace, Budget and Transport: equal widths that fill
 * the row (up to a comfortable maximum), 44 px touch targets, roomy padding.
 * One shared style, so all three groups always look the same.
 */
const SEGMENTED = {
  width: "100%",
  maxWidth: 560,
  "& .MuiToggleButton-root": {
    flex: 1,
    minHeight: 44,
    px: 2,
    py: 1,
    lineHeight: 1.3,
    fontWeight: 600,
  },
} as const;

const toggle = <T,>(items: T[], item: T): T[] =>
  items.includes(item) ? items.filter((i) => i !== item) : [...items, item];

/** A labelled group of settings inside "Tune it". */
const Setting = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <Box sx={{ mb: 2.5 }}>
    <Typography sx={{ fontWeight: 600, mb: 0.75 }}>
      {label}{" "}
      {hint && (
        <Typography component="span" variant="body2" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Typography>
    {children}
  </Box>
);

/**
 * The one-screen onboarding from the design doc (§4.2): Start Date with
 * heads-ups, an optional "Where", and a collapsed "Tune it". Only the date is
 * required; everything else has a default.
 */
export const OnboardingPage = ({ places, today, onStart }: Props) => {
  const [startDate, setStartDate] = useState<IsoDate>(today);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);

  const update = (changes: Partial<Preferences>) =>
    setPrefs((p) => ({ ...p, ...changes }));

  const isPast = isPastDate(startDate, today);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(startDate) && !isPast;

  // Recomputed only when the date changes (they scan every Place × 3 dates).
  const notes = useMemo(
    () => (validDate ? headsUps(places, startDate) : []),
    [places, startDate, validDate],
  );
  const counts = useMemo(
    () => (validDate ? cityCounts(places, startDate) : null),
    [places, startDate, validDate],
  );
  const byName = useMemo(
    () => [...places].sort((a, b) => a.name.localeCompare(b.name)),
    [places],
  );
  const mustSeePlaces = byName.filter((p) => prefs.mustSees.includes(p.id));

  const start = (startEmpty: boolean) => {
    if (validDate) onStart({ startDate, prefs, startEmpty });
  };

  return (
    <main className="onboarding">
      <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
        3 Days in Italy
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Plan three days from 100 hand-picked places. Only the date is needed.
      </Typography>

      <Box component="section" sx={{ mb: 3 }}>
        <TextField
          id="start-date"
          type="date"
          label="When does your trip start?"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          error={isPast}
          helperText={
            isPast ? "That date has passed. Pick today or later." : undefined
          }
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { min: today, "aria-describedby": "date-notes" },
          }}
        />
        <div id="date-notes" aria-live="polite">
          {validDate && (
            <>
              <Typography sx={{ fontWeight: 600, mt: 1 }}>
                {tripDates(startDate).map(formatDate).join(" · ")}
              </Typography>
              {notes.length > 0 && (
                <Box
                  component="ul"
                  sx={{
                    m: 0,
                    pl: 2.5,
                    color: "text.secondary",
                    fontSize: "0.9375rem",
                  }}
                >
                  {notes.map((note) => (
                    <li key={`${note.kind}-${note.date}`}>
                      {headsUpText(note)}
                    </li>
                  ))}
                </Box>
              )}
            </>
          )}
        </div>
      </Box>

      <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, mb: 3 }}>
        <Typography component="legend" sx={{ fontWeight: 600, mb: 0.75 }}>
          Where?{" "}
          <Typography component="span" variant="body2" color="text.secondary">
            Optional: leave empty and we'll choose
          </Typography>
        </Typography>
        <FormGroup sx={{ gap: 1 }}>
          {BASE_CITY_NAMES.map((city) => {
            const checked = prefs.tripArea.includes(city);
            return (
              <Card
                key={city}
                variant="outlined"
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderColor: checked ? "primary.main" : "divider",
                  bgcolor: checked ? "var(--accent-soft)" : "background.paper",
                }}
              >
                <FormControlLabel
                  sx={{ alignItems: "flex-start", width: "100%", m: 0 }}
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={() =>
                        update({ tripArea: toggle(prefs.tripArea, city) })
                      }
                    />
                  }
                  label={
                    <Box sx={{ py: 1 }}>
                      <Typography component="span" sx={{ fontWeight: 600 }}>
                        {city}
                      </Typography>
                      {counts && (
                        <Typography variant="body2" color="text.secondary">
                          {counts[city].open} of {counts[city].total} open on
                          your dates
                        </Typography>
                      )}
                      {counts && counts[city].towns.length > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          + day trips: {counts[city].towns.join(", ")}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </Card>
            );
          })}
        </FormGroup>
      </Box>

      <Accordion variant="outlined" disableGutters sx={{ mb: 3 }}>
        <AccordionSummary>
          <Box>
            <Typography sx={{ fontWeight: 600 }}>
              Tune it{" "}
              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
              >
                Optional
              </Typography>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tuneSummary(prefs)}
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Setting label="Interests">
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: "wrap" }}
              role="group"
              aria-label="Interests"
            >
              {INTERESTS.map((interest) => {
                const selected = prefs.interests.includes(interest);
                return (
                  <Chip
                    key={interest}
                    label={interestLabel(interest)}
                    color={selected ? "primary" : "default"}
                    variant={selected ? "filled" : "outlined"}
                    // MUI's Chip doesn't announce on/off, so say it explicitly.
                    aria-pressed={selected}
                    onClick={() =>
                      update({ interests: toggle(prefs.interests, interest) })
                    }
                  />
                );
              })}
            </Stack>
          </Setting>

          <Setting label="Pace">
            <ToggleButtonGroup
              exclusive
              color="primary"
              sx={SEGMENTED}
              aria-label="Pace"
              value={prefs.pace}
              // Clicking the chosen option again would send null; keep the choice.
              onChange={(_, value: Pace | null) =>
                value && update({ pace: value })
              }
            >
              {PACES.map(({ value, label, hint }) => (
                <ToggleButton key={value} value={value}>
                  {/* Label on top, hint underneath, so the button isn't cramped. */}
                  <Stack spacing={0.25}>
                    <span>{label}</span>
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                    >
                      {hint}
                    </Typography>
                  </Stack>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Setting>

          <Setting label="Budget" hint="A target, not a limit">
            <ToggleButtonGroup
              exclusive
              color="primary"
              sx={SEGMENTED}
              aria-label="Budget"
              value={prefs.budget ?? "any"}
              onChange={(_, value: PriceLevel | "any" | null) =>
                value && update({ budget: value === "any" ? null : value })
              }
            >
              {BUDGETS.map(({ value, label }) => (
                <ToggleButton key={value} value={value}>
                  {label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Setting>

          <Setting label="Getting between cities">
            <ToggleButtonGroup
              exclusive
              color="primary"
              sx={SEGMENTED}
              aria-label="Getting between cities"
              value={prefs.mode}
              onChange={(_, value: TransportMode | null) =>
                value && update({ mode: value })
              }
            >
              {MODES.map(({ value, label }) => (
                <ToggleButton key={value} value={value}>
                  {label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Setting>

          <Setting label="Meals">
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={prefs.lunch}
                    onChange={() => update({ lunch: !prefs.lunch })}
                  />
                }
                label="Lunch"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={prefs.dinner}
                    onChange={() => update({ dinner: !prefs.dinner })}
                  />
                }
                label="Dinner"
              />
            </FormGroup>
          </Setting>

          {/* An accessible type-ahead (combobox): a real improvement on <datalist>. */}
          <Autocomplete
            multiple
            filterSelectedOptions
            options={byName}
            getOptionLabel={(p) => p.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={mustSeePlaces}
            onChange={(_, chosen) =>
              update({ mustSees: chosen.map((p) => p.id) })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Must-Sees"
                placeholder="Type a place…"
                helperText="Always included"
              />
            )}
          />
        </AccordionDetails>
      </Accordion>

      {/* .actions keeps the sticky-on-mobile rule (thumb zone). */}
      <div className="actions">
        <Button
          variant="contained"
          size="large"
          disableElevation
          disabled={!validDate}
          onClick={() => start(false)}
        >
          Plan my trip
        </Button>
        <Button
          variant="text"
          disabled={!validDate}
          onClick={() => start(true)}
        >
          Start with empty days →
        </Button>
      </div>
    </main>
  );
};
