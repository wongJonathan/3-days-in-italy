import { useState } from "react";
import { PLACES } from "./data/places.ts";
import { todayInRome } from "./hours/calendar.ts";
import { useTrip } from "./trip/useTrip.ts";
import { Onboarding } from "./ui/Onboarding.tsx";
import { TripPreview } from "./ui/TripPreview.tsx";

/** A saved Trip opens straight away; otherwise onboarding. */
const App = () => {
  const { trip, start, reset } = useTrip(PLACES);
  // Today in Italy, read once: Start Dates before it are blocked.
  const [today] = useState(() => todayInRome(new Date()));

  return trip ? (
    <TripPreview trip={trip} places={PLACES} onReset={reset} />
  ) : (
    <Onboarding places={PLACES} today={today} onStart={start} />
  );
};

export default App;
