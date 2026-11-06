import { GlobalStyles } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { useState } from "react";
import { PLACES } from "./data/places.ts";
import { todayInRome } from "./hours/calendar.ts";
import { useTrip } from "./trip/useTrip.ts";
import { Editor } from "./ui/Editor.tsx";
import { Notices } from "./ui/Notices.tsx";
import { Onboarding } from "./ui/Onboarding.tsx";
import { theme } from "./ui/theme.ts";
import { cssVariables } from "./ui/tokens.ts";

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
      {/* The colour tokens as CSS variables (--accent, …), from the single source. */}
      <GlobalStyles styles={{ ":root": cssVariables() }} />
      {trip ? (
        <Editor
          trip={trip}
          places={PLACES}
          dispatch={dispatch}
          onReset={reset}
          notices={notices}
        />
      ) : (
        <>
          <div className="onboarding__notices">{notices}</div>
          <Onboarding places={PLACES} today={today} onStart={start} />
        </>
      )}
    </ThemeProvider>
  );
};

export default App;
