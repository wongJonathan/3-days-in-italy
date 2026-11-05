// Smoke test: renders the editor for a real generated Trip (no browser needed).
// The wording is unit-tested in editor/copy.test.ts; this checks it is wired in.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PLACES } from "../data/places.ts";
import { DEFAULT_PREFERENCES } from "../preferences/preferences.ts";
import { createTrip, tripReducer, type Trip } from "../trip/trip.ts";
import { Editor } from "./Editor.tsx";

const render = (trip: Trip) =>
  renderToStaticMarkup(
    <Editor
      trip={trip}
      places={PLACES}
      dispatch={() => {}}
      onReset={() => {}}
    />,
  );

// Friday 6 November 2026, Must-See: Vatican Museums (closed Sundays).
const trip = createTrip(
  {
    startDate: "2026-11-06",
    prefs: { ...DEFAULT_PREFERENCES, mustSees: ["place_010"], lunch: true },
    startEmpty: false,
  },
  PLACES,
);

describe("<Editor>", () => {
  const html = render(trip);

  it("shows the Trip panel with 3 day cards and their status", () => {
    expect(html).toContain("Day 1 · Fri 6 Nov");
    expect(html).toContain("Day 3 · Sun 8 Nov");
    expect(html).toContain("editing");
    expect(html).toContain("Not planned yet");
  });

  it("shows the open day's header and actions", () => {
    expect(html).toContain("Day 1 · Fri 6 Nov</h2>");
    expect(html).toContain("chosen for you");
    expect(html).toMatch(/\d+ Stops · \d+ Warnings? · ends \d\d:\d\d/);
    expect(html).toContain("Regenerate day");
    expect(html).toContain("Finalize day");
  });

  it("shows Stops with Hours Status, travel estimates and the kept Must-See", () => {
    expect(html).toContain("Vatican Museums");
    expect(html).toContain("★ Must-See");
    expect(html).toMatch(/Hours (known|assumed) · /);
    expect(html).toContain("(est.)");
    expect(html).toContain("Lunch");
  });

  it("shows a Warning in words when a kept Stop breaks a rule", () => {
    // Day 3 is Sunday. Adding the Vatican there by hand keeps it, with a Warning.
    const reduce = tripReducer(PLACES);
    const sunday = [
      { type: "openDay", day: 2 } as const,
      { type: "addPlace", day: 2, placeId: "place_010" } as const,
    ].reduce(reduce, trip);
    expect(render(sunday)).toContain("Closed on Sundays.");
  });
});

describe("<Editor> Place list", () => {
  const html = render(trip);

  it("shows the Place list with its filters", () => {
    expect(html).toContain("Add places");
    expect(html).toContain("Search all places");
    expect(html).toContain("All of Italy");
    expect(html).toContain("Open Fri 6 Nov");
  });

  it("groups by price, with one group when no Budget is set", () => {
    expect(html).toContain("All places");
    expect(html).toMatch(/\+ Add/);
    // Day 1 Stops are in the schedule, so the list does not repeat them.
    expect(html).not.toContain("On this day");
  });

  it("shows the four budget groups when a Budget is set", () => {
    const withBudget = render({
      ...trip,
      prefs: { ...trip.prefs, budget: "€€" },
    });
    expect(withBudget).toContain("Around €€ · your budget");
    expect(withBudget).toContain("A little under · €");
    expect(withBudget).toContain("A little over · €€€");
    expect(withBudget).toContain("Other prices");
  });

  it("marks Must-Sees as pressed", () => {
    // Hard Rock Cafe Rome: a Must-See that is not on Day 1, so it is in the list.
    const starred = render({
      ...trip,
      prefs: { ...trip.prefs, mustSees: [...trip.prefs.mustSees, "place_025"] },
    });
    expect(starred).toContain(
      'aria-pressed="true" aria-label="Must-See: Hard Rock Cafe Rome"',
    );
  });

  it("hides Places already on the open day", () => {
    // The Vatican is a Must-See planned on Day 1: in the schedule, not the list.
    expect(html).not.toContain('aria-label="Must-See: Vatican Museums"');
  });
});

describe("<Editor> places on other days", () => {
  it("notes when a listed place is already planned for another day", () => {
    const reduce = tripReducer(PLACES);
    const backOnDay1 = [
      { type: "openDay", day: 1 } as const,
      { type: "openDay", day: 0 } as const,
    ].reduce(reduce, trip);
    expect(render(backOnDay1)).toContain(
      "Already planned for Day 2 (Sat 7 Nov)",
    );
  });
});
