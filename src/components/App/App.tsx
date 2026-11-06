import { GlobalStyles } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { useState } from "react";
import { PLACES } from "../../utils/data/places.ts";
import { todayInRome } from "../../utils/hours/calendar.ts";
import { useTrip } from "../../stores/useTrip.ts";
import { EditorPage } from "../../pages/EditorPage/EditorPage.tsx";
import { Notices } from "../Notices/Notices.tsx";
import { OnboardingPage } from "../../pages/OnboardingPage/OnboardingPage.tsx";
import { theme } from "../../utils/theme.ts";
import { cssVariables } from "../../utils/colors.ts";

/** The colour tokens as CSS variables (--accent, …). Static, so built once. */
const ROOT_VARIABLES = { ":root": cssVariables() };

/** A saved Trip opens straight away in the editor; otherwise onboarding. */
const App = () => {
  const { trip, dispatch, start, reset, canSave, removedStops } =
    useTrip(PLACES);
  // Today in Italy, read once: Start Dates before it are blocked.
  const [today] = useState(() => todayInRome(new Date()));
  const [removedDismissed, setRemovedDismissed] = useState(false);

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
      {trip ? (
        <EditorPage
          trip={trip}
          places={PLACES}
          dispatch={dispatch}
          onReset={reset}
          notices={notices}
        />
      ) : (
        <>
          <div className="onboarding__notices">{notices}</div>
          <OnboardingPage places={PLACES} today={today} onStart={start} />
        </>
      )}
    </ThemeProvider>
  );
};

export default App;
