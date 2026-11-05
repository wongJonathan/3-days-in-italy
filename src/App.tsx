import { useState } from "react";
import { PLACES } from "./data/places.ts";
import { todayInRome } from "./hours/calendar.ts";
import { useTrip } from "./trip/useTrip.ts";
import { Editor } from "./ui/Editor.tsx";
import { Onboarding } from "./ui/Onboarding.tsx";

/** A saved Trip opens straight away in the editor; otherwise onboarding. */
const App = () => {
  const { trip, dispatch, start, reset } = useTrip(PLACES);
  // Today in Italy, read once: Start Dates before it are blocked.
  const [today] = useState(() => todayInRome(new Date()));

  return trip ? (
    <Editor trip={trip} places={PLACES} dispatch={dispatch} onReset={reset} />
  ) : (
    <Onboarding places={PLACES} today={today} onStart={start} />
  );
};

export default App;
