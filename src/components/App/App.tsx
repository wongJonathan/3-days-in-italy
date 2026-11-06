import { GlobalStyles } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { useEffect, useState, type ReactNode } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router";
import { PLACES } from "../../utils/data/places.ts";
import { todayInRome } from "../../utils/hours/calendar.ts";
import { useTrip } from "../../stores/useTrip.ts";
import {
  completesTrip,
  type Trip,
  type TripAction,
} from "../../stores/trip.ts";
import { EditorPage } from "../../pages/EditorPage/EditorPage.tsx";
import { NewTripDialog } from "../NewTripDialog/NewTripDialog.tsx";
import { Notices } from "../Notices/Notices.tsx";
import { OnboardingPage } from "../../pages/OnboardingPage/OnboardingPage.tsx";
import { OverviewPage } from "../../pages/OverviewPage/OverviewPage.tsx";
import { SharePage } from "../../pages/SharePage/SharePage.tsx";
import { theme } from "../../utils/theme.ts";
import { cssVariables } from "../../utils/colors.ts";
import {
  redirectFor,
  ROUTES,
  type GuardedRoute,
} from "../../utils/routes/routes.ts";

/** The colour tokens as CSS variables (--accent, …). Static, so built once. */
const ROOT_VARIABLES = { ":root": cssVariables() };

const App = () => {
  const { trip, dispatch, start, reset, canSave, removedStops } =
    useTrip(PLACES);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Today in Italy, read once: Start Dates before it are blocked.
  const [today] = useState(() => todayInRome(new Date()));
  const [removedDismissed, setRemovedDismissed] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // Each page starts at the top, not where the last one was scrolled.
  // Braces: the effect must return nothing. Newer browsers return a Promise
  // from scrollTo, which React would try to call as the clean-up.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  /** Like dispatch, but the Finalize that signs off the last day opens the overview. */
  const act = (action: TripAction) => {
    if (trip && completesTrip(trip, action)) navigate(ROUTES.overview);
    dispatch(action);
  };

  const confirmReset = () => {
    setConfirmingReset(false);
    reset();
    // Replace: Back shouldn't return to the deleted Trip.
    navigate(ROUTES.home, { replace: true });
  };

  /** Shows `page` for the saved Trip, or redirects when the Trip isn't ready for it. */
  const guarded = (route: GuardedRoute, page: (trip: Trip) => ReactNode) => {
    const to = redirectFor(route, trip);
    if (to) return <Navigate to={to} replace />;
    return trip ? page(trip) : null;
  };

  const notices = (
    <Notices
      canSave={canSave}
      removedStops={removedDismissed ? 0 : removedStops}
      onDismissRemoved={() => setRemovedDismissed(true)}
    />
  );

  const homeRedirect = redirectFor(ROUTES.home, trip);

  // MUI theme for every component. No CssBaseline (MUI's global reset): index.css sets the base styles.
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles styles={ROOT_VARIABLES} />
      <Routes>
        <Route
          path={ROUTES.home}
          element={
            homeRedirect ? (
              <Navigate to={homeRedirect} replace />
            ) : (
              <>
                <div className="onboarding__notices">{notices}</div>
                <OnboardingPage places={PLACES} today={today} onStart={start} />
              </>
            )
          }
        />
        <Route
          path={ROUTES.plan}
          element={guarded(ROUTES.plan, (t) => (
            <EditorPage
              trip={t}
              places={PLACES}
              dispatch={act}
              onReset={() => setConfirmingReset(true)}
              onViewTrip={() => navigate(ROUTES.overview)}
              notices={notices}
            />
          ))}
        />
        <Route
          path={ROUTES.overview}
          element={guarded(ROUTES.overview, (t) => (
            <OverviewPage
              kind="own"
              trip={t}
              places={PLACES}
              onEdit={(day) => {
                dispatch({ type: "openDay", day });
                navigate(ROUTES.plan);
              }}
              onNewTrip={() => setConfirmingReset(true)}
              notices={notices}
            />
          ))}
        />
        <Route path={ROUTES.share} element={<SharePage places={PLACES} />} />
        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Routes>
      <NewTripDialog
        open={confirmingReset}
        onCancel={() => setConfirmingReset(false)}
        onConfirm={confirmReset}
      />
    </ThemeProvider>
  );
};

export default App;
