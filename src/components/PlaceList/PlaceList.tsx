import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  Stack,
  TextField,
  ToggleButton,
  Typography,
} from "@mui/material";
import { useState } from "react";
import type { CleanPlace } from "../../utils/data/place.ts";
import {
  emptyGroupText,
  formatDuration,
  groupTitle,
  hoursLabel,
} from "../../utils/editor/copy.ts";
import {
  buildPlaceList,
  DEFAULT_FILTERS,
  type ListFilters,
  type ListRow,
  type ListScope,
} from "../../utils/editor/place-list.ts";
import { baseCityOf } from "../../utils/preferences/base-cities.ts";
import { INTERESTS, interestLabel } from "../../utils/preferences/interests.ts";
import { chipsFor } from "../../utils/scoring/score.ts";
import type { Trip, TripAction } from "../../stores/trip.ts";
import { formatDate } from "../../utils/format.ts";
import { toggle } from "../../utils/list.ts";
import { EmptyState } from "../EmptyState/EmptyState.tsx";
import { WhyLine } from "../WhyLine/WhyLine.tsx";

type Props = {
  trip: Trip;
  places: CleanPlace[];
  dispatch: (action: TripAction) => void;
  /** Called after a Place is added, so the new Stop can be selected. */
  onAdded: (placeId: string) => void;
};

/** The search box id, so "Add places →" on an empty day can focus it. */
export const PLACE_SEARCH_ID = "place-search";

/** A group heading with its count (also the sticky heading inside the scroll). */
const GroupHeading = ({ title, count }: { title: string; count: number }) => (
  <Typography
    component="h3"
    variant="subtitle2"
    className="group__title"
    sx={{ fontWeight: 600 }}
  >
    {title}{" "}
    <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
      {count}
    </Box>
  </Typography>
);

/** The Place list for the open day: filters, budget groups, Add and Must-See (design doc §3.7). */
export const PlaceList = ({ trip, places, dispatch, onAdded }: Props) => {
  const [filters, setFilters] = useState<ListFilters>(DEFAULT_FILTERS);
  const [announcement, setAnnouncement] = useState("");
  const update = (changes: Partial<ListFilters>) =>
    setFilters((f) => ({ ...f, ...changes }));

  const dayIndex = trip.openDay;
  const day = trip.days[dayIndex];
  const list = buildPlaceList(trip, dayIndex, places, filters);
  // Same order as the list logic: a pinned Day Area wins.
  const dayCity = day.dayArea ?? day.plan?.baseCity;
  const total =
    list.groups.reduce((sum, g) => sum + g.rows.length, 0) +
    list.outside.length;
  // No Budget: one "All places" group, whose heading sits outside the scroll.
  const singleGroup = list.groups.length === 1 ? list.groups[0] : null;

  const add = (place: CleanPlace) => {
    dispatch({ type: "addPlace", day: dayIndex, placeId: place.id });
    onAdded(place.id);
    setAnnouncement(`Added ${place.name} to Day ${dayIndex + 1}.`);
  };

  const row = (r: ListRow) => {
    const { place } = r;
    const isMustSee = trip.prefs.mustSees.includes(place.id);
    const chips = chipsFor(
      r.points === null
        ? { kind: "excluded", reason: "low-rating" }
        : { kind: "scored", points: r.points, reasons: r.reasons },
    );
    const city = baseCityOf(place);
    const closed = r.availability.kind === "closed";
    return (
      <Card
        key={place.id}
        component="li"
        variant="outlined"
        sx={{ bgcolor: closed ? "var(--surface-alt)" : "background.paper" }}
      >
        <CardContent
          sx={{
            display: "flex",
            gap: 1.5,
            justifyContent: "space-between",
            alignItems: "flex-start",
            py: 1.25,
            "&:last-child": { pb: 1.25 }, // MUI adds extra bottom padding by default
          }}
        >
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600 }}>{place.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {[
                place.type.replaceAll("_", " "),
                `★ ${place.rating}`,
                place.price_range,
                place.duration_minutes
                  ? formatDuration(place.duration_minutes)
                  : null,
                place.city !== city
                  ? `${place.city} (near ${city})`
                  : place.city,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {hoursLabel(place, r.availability)}
            </Typography>
            <WhyLine chips={chips} />
            <Stack
              direction="row"
              spacing={0.5}
              useFlexGap
              sx={{ flexWrap: "wrap" }}
            >
              {r.onOtherDays.map((i) => (
                <Chip
                  key={i}
                  size="small"
                  color="warning"
                  variant="outlined"
                  label={`Already planned for Day ${i + 1} (${formatDate(trip.days[i].date)})`}
                />
              ))}
              {r.points === null && (
                <Chip size="small" variant="outlined" label="Rated under 4.0" />
              )}
            </Stack>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0 }}>
            {/* ToggleButton sets aria-pressed itself from `selected`. */}
            <ToggleButton
              value="must-see"
              size="small"
              color="primary"
              selected={isMustSee}
              aria-label={`Must-See: ${place.name}`}
              title={
                isMustSee ? "Must-See (always included)" : "Make it a Must-See"
              }
              onChange={() =>
                dispatch({ type: "toggleMustSee", placeId: place.id })
              }
            >
              ★
            </ToggleButton>
            <Button
              variant="outlined"
              size="small"
              disabled={!day.plan}
              aria-label={`Add ${place.name} to Day ${dayIndex + 1}`}
              onClick={() => add(place)}
            >
              + Add
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  const rowList = (rows: ListRow[]) => (
    <Stack component="ul" spacing={1} sx={{ listStyle: "none", m: 0, p: 0 }}>
      {rows.map(row)}
    </Stack>
  );

  const scopeOptions: { value: ListScope; label: string }[] = [
    { value: "day", label: dayCity ? `${dayCity} (this day)` : "This day" },
    ...(trip.prefs.tripArea.length > 0
      ? [
          {
            value: "trip" as const,
            label: `My Where: ${trip.prefs.tripArea.join(", ")}`,
          },
        ]
      : []),
    { value: "all", label: "All of Italy" },
  ];

  return (
    <section className="place-list" aria-labelledby="place-list-title">
      <Typography
        id="place-list-title"
        component="h2"
        variant="h6"
        className="place-list__title"
      >
        Add places
      </Typography>

      <Stack
        direction="row"
        spacing={1.5}
        useFlexGap
        sx={{ flexWrap: "wrap", alignItems: "center", mb: 1.25 }}
      >
        <TextField
          id={PLACE_SEARCH_ID}
          type="search"
          size="small"
          label="Search all places"
          placeholder="Name or city…"
          value={filters.query}
          onChange={(e) => update({ query: e.target.value })}
          sx={{ flex: "1 1 200px" }}
        />
        {/* Native select: works best with screen readers and phone keyboards. */}
        <TextField
          select
          size="small"
          label="Area"
          value={filters.scope}
          onChange={(e) => update({ scope: e.target.value as ListScope })}
          slotProps={{ select: { native: true } }}
        >
          {scopeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </TextField>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={filters.openOnly}
              onChange={() => update({ openOnly: !filters.openOnly })}
            />
          }
          label={`Open ${formatDate(day.date)}`}
        />
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ flexWrap: "wrap", mb: 2 }}
        role="group"
        aria-label="Filter by interest"
      >
        {INTERESTS.map((interest) => {
          const selected = filters.interests.includes(interest);
          return (
            <Chip
              key={interest}
              label={interestLabel(interest)}
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
              // MUI's Chip doesn't announce on/off, so say it explicitly.
              aria-pressed={selected}
              onClick={() =>
                update({ interests: toggle(filters.interests, interest) })
              }
            />
          );
        })}
      </Stack>

      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>

      {singleGroup && total > 0 && (
        <Box className="place-list__heading">
          <GroupHeading
            title={groupTitle(singleGroup.group, trip.prefs.budget)}
            count={singleGroup.rows.length}
          />
        </Box>
      )}

      {/* Only the results scroll; search and filters stay in view above them. */}
      <div className="place-list__results">
        {total === 0 ? (
          <EmptyState message="No places match.">
            {filters.query && (
              <Button variant="outlined" onClick={() => update({ query: "" })}>
                Clear search
              </Button>
            )}
            {filters.openOnly && (
              <Button
                variant="outlined"
                onClick={() => update({ openOnly: false })}
              >
                Show closed
              </Button>
            )}
            {filters.interests.length > 0 && (
              <Button
                variant="outlined"
                onClick={() => update({ interests: [] })}
              >
                Any interest
              </Button>
            )}
            {filters.scope !== "all" && (
              <Button
                variant="outlined"
                onClick={() => update({ scope: "all" })}
              >
                All of Italy
              </Button>
            )}
          </EmptyState>
        ) : (
          <>
            {list.groups.map(({ group, rows }) => {
              const title = groupTitle(group, trip.prefs.budget);
              const content =
                rows.length > 0 ? (
                  rowList(rows)
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {emptyGroupText(group, trip.prefs.budget)}
                  </Typography>
                );
              if (singleGroup) return <div key={group}>{content}</div>;
              // "Other prices" starts collapsed, but is never hidden (design doc §3.7).
              return group === "other" ? (
                <Accordion
                  key={group}
                  disableGutters
                  variant="outlined"
                  sx={{ mb: 2 }}
                >
                  <AccordionSummary>
                    <GroupHeading title={title} count={rows.length} />
                  </AccordionSummary>
                  <AccordionDetails>{content}</AccordionDetails>
                </Accordion>
              ) : (
                <Box component="section" key={group} sx={{ mb: 2 }}>
                  <GroupHeading title={title} count={rows.length} />
                  {content}
                </Box>
              );
            })}
            {list.outside.length > 0 && (
              <Box component="section" sx={{ mb: 2 }}>
                <GroupHeading
                  title="Outside your area"
                  count={list.outside.length}
                />
                {rowList(list.outside)}
              </Box>
            )}
          </>
        )}
      </div>
    </section>
  );
};
