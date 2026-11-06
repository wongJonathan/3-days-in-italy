import {
  lazy,
  Suspense,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Button, ToggleButton, ToggleButtonGroup } from "@mui/material";
import type { CleanPlace } from "../data/place.ts";
import { dayMapModel } from "../editor/map-model.ts";
import { scheduleStops } from "../generator/generate-day.ts";
import { unplannedMustSees, type Trip, type TripAction } from "../trip/trip.ts";
import { DayView } from "./DayView.tsx";
import { PLACE_SEARCH_ID, PlaceList } from "./PlaceList.tsx";
import { TripPanel } from "./TripPanel.tsx";

/**
 * Leaflet is loaded as a separate file, after the editor appears, so it
 * doesn't slow the first screen down.
 */
const DayMap = lazy(() => import("./DayMap.tsx"));

/** Being in a browser never changes, so there is nothing to subscribe to. */
const noSubscription = () => () => {};

/** Narrow screens show one of these at a time (design doc §3.8). */
type Tab = "schedule" | "map" | "add";

const TABS: { value: Tab; label: string }[] = [
  { value: "schedule", label: "Schedule" },
  { value: "map", label: "Map" },
  { value: "add", label: "Add" },
];

type Props = {
  trip: Trip;
  places: CleanPlace[];
  dispatch: (action: TripAction) => void;
  onReset: () => void;
  /** App-wide banners (storage, removed Stops), shown above the Trip panel. */
  notices?: ReactNode;
};

/**
 * The editor: Trip panel | open day | map and Place list.
 * Schedules are recomputed from the Trip on every render. The scheduler is
 * pure and fast, so there is no stored copy of times that could go stale.
 * On narrow screens, CSS shows one tab at a time plus a bottom action bar;
 * wide screens show every column and ignore the tab.
 */
export const Editor = ({ trip, places, dispatch, onReset, notices }: Props) => {
  const placesById = useMemo(
    () => new Map(places.map((p) => [p.id, p])),
    [places],
  );
  const schedules = trip.days.map((day) =>
    day.plan
      ? scheduleStops(day.plan.stops, {
          date: day.date,
          window: day.window,
          mode: trip.prefs.mode,
          placesById,
        })
      : null,
  );
  const [tab, setTab] = useState<Tab>("schedule");

  // The map needs a real browser (Leaflet uses `window`). During server
  // rendering (the Node smoke tests) the third function answers instead,
  // so Leaflet is never loaded there.
  const inBrowser = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );

  /** "Add places →" on an empty day: show the list and put the cursor in its search. */
  const goToPlaces = () => {
    setTab("add");
    // Wait a frame so the list is visible (it is hidden on other tabs) before focusing.
    requestAnimationFrame(() =>
      document.getElementById(PLACE_SEARCH_ID)?.focus(),
    );
  };

  const index = trip.openDay;
  const day = trip.days[index];
  const schedule = schedules[index];
  const warningCount = schedule?.warningCount ?? 0;

  const mapPlaceholder = (
    <div className="map map--placeholder">Loading map…</div>
  );

  return (
    <div className="editor" data-tab={tab}>
      <div className="editor__left">
        {notices}
        <TripPanel
          trip={trip}
          schedules={schedules}
          onOpen={(i) => dispatch({ type: "openDay", day: i })}
          onReset={onReset}
        />
      </div>

      {/* .editor__tabs keeps the rule that shows the tabs only on narrow screens. */}
      <div className="editor__tabs">
        <ToggleButtonGroup
          exclusive
          fullWidth
          color="primary"
          aria-label="Show"
          value={tab}
          // Clicking the open tab again would send null; keep it open.
          onChange={(_, value: Tab | null) => value && setTab(value)}
        >
          {TABS.map(({ value, label }) => (
            <ToggleButton key={value} value={value} sx={{ minHeight: 44 }}>
              {label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </div>

      <DayView
        trip={trip}
        index={index}
        schedule={schedule}
        placesById={placesById}
        unplanned={unplannedMustSees(trip)}
        dispatch={dispatch}
        onAddPlaces={goToPlaces}
      />
      <aside className="editor__side" aria-label="Map and places">
        {inBrowser ? (
          <Suspense fallback={mapPlaceholder}>
            <DayMap
              model={dayMapModel(trip, index, schedule, placesById)}
              label={`Map of Day ${index + 1}`}
            />
          </Suspense>
        ) : (
          mapPlaceholder
        )}
        <PlaceList trip={trip} places={places} dispatch={dispatch} />
      </aside>

      {/* Narrow screens: the day's main actions stay in reach of the thumb. */}
      {day.plan && (
        <div className="mobile-bar">
          <span className="mobile-bar__warnings">
            {warningCount > 0
              ? `! ${warningCount} Warning${warningCount === 1 ? "" : "s"}`
              : "No Warnings"}
          </span>
          <Button
            variant="outlined"
            onClick={() => dispatch({ type: "regenerate", day: index })}
          >
            ↻ {day.plan.stops.length === 0 ? "Suggest" : "Regenerate"}
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={() => dispatch({ type: "finalize", day: index })}
          >
            ✓ Finalize
          </Button>
        </div>
      )}
    </div>
  );
};
