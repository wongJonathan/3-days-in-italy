import { GlobalStyles } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { useState } from "react";
import { PLACES } from "../../utils/data/places.ts";
import { todayInRome } from "../../utils/hours/calendar.ts";
import { useTrip } from "../../stores/useTrip.ts";
import {
  completesTrip,
  isTripFinalized,
  type TripAction,
} from "../../stores/trip.ts";
import { EditorPage } from "../../pages/EditorPage/EditorPage.tsx";
import { NewTripDialog } from "../NewTripDialog/NewTripDialog.tsx";
import { Notices } from "../Notices/Notices.tsx";
import { OnboardingPage } from "../../pages/OnboardingPage/OnboardingPage.tsx";
import { OverviewPage } from "../../pages/OverviewPage/OverviewPage.tsx";
import { theme } from "../../utils/theme.ts";
import { cssVariables } from "../../utils/colors.ts";

/** The colour tokens as CSS variables (--accent, …). Static, so built once. */
const ROOT_VARIABLES = { ":root": cssVariables() };

/** Which screen a Trip is shown on. Not saved: it follows from the Trip. */
type View = "editor" | "overview";

/** Each view starts at the top of the page, not where the last one was scrolled. */
const scrollToTop = () => window.scrollTo(0, 0);

/**
 * No Trip: onboarding. A Trip with every day finalized: the Trip Overview
 * (including straight after a reload). Otherwise: the editor.
 */
const App = () => {
  const { trip, dispatch, start, reset, canSave, removedStops } =
    useTrip(PLACES);
  // Today in Italy, read once: Start Dates before it are blocked.
  const [today] = useState(() => todayInRome(new Date()));
  const [removedDismissed, setRemovedDismissed] = useState(false);
  const [view, setView] = useState<View>(() =>
    trip && isTripFinalized(trip) ? "overview" : "editor",
  );
  const [confirmingReset, setConfirmingReset] = useState(false);

  const showView = (next: View) => {
    setView(next);
    scrollToTop();
  };

  /** Like dispatch, but the Finalize that signs off the last day opens the overview. */
  const act = (action: TripAction) => {
    if (trip && completesTrip(trip, action)) showView("overview");
    dispatch(action);
  };

  const confirmReset = () => {
    setConfirmingReset(false);
    reset();
    showView("editor");
  };

  const notices = (
    <Notices
      canSave={canSave}
      removedStops={removedDismissed ? 0 : removedStops}
      onDismissRemoved={() => setRemovedDismissed(true)}
    />
  );

  // MUI theme for every component. No CssBaseline (MUI's global reset): index.css sets the base styles.
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles styles={ROOT_VARIABLES} />
      {/* The overview only opens with every day finalized, even if `view` says so. */}
      {trip && view === "overview" && isTripFinalized(trip) ? (
        <OverviewPage
          trip={trip}
          places={PLACES}
          onEdit={(day) => {
            dispatch({ type: "openDay", day });
            showView("editor");
          }}
          onNewTrip={() => setConfirmingReset(true)}
          notices={notices}
        />
      ) : trip ? (
        <EditorPage
          trip={trip}
          places={PLACES}
          dispatch={act}
          onReset={() => setConfirmingReset(true)}
          onViewTrip={() => showView("overview")}
          notices={notices}
        />
      ) : (
        <>
          <div className="onboarding__notices">{notices}</div>
          <OnboardingPage places={PLACES} today={today} onStart={start} />
        </>
      )}
      <NewTripDialog
        open={confirmingReset}
        onCancel={() => setConfirmingReset(false)}
        onConfirm={confirmReset}
      />
    </ThemeProvider>
  );
};

export default App;
