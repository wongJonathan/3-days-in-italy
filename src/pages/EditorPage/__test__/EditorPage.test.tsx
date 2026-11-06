// Smoke test: renders the editor for a real generated Trip (no browser needed).
// The wording is unit-tested in editor/copy.test.ts; this checks it is wired in.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PLACES } from "../../../utils/data/places.ts";
import { DEFAULT_PREFERENCES } from "../../../utils/preferences/preferences.ts";
import { createTrip, tripReducer, type Trip } from "../../../stores/trip.ts";
import { EditorPage } from "../EditorPage.tsx";

const render = (trip: Trip) =>
  renderToStaticMarkup(
    <EditorPage
      trip={trip}
      places={PLACES}
      dispatch={() => {}}
      onReset={() => {}}
      onViewTrip={() => {}}
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

describe("<EditorPage>", () => {
  const html = render(trip);

  it("shows the Trip panel with 3 day cards and their status", () => {
    expect(html).toContain("Day 1 · Fri 6 Nov");
    expect(html).toContain("Day 3 · Sun 8 Nov");
    expect(html).toContain("editing");
    expect(html).toContain("Not planned yet");
  });

  it("keeps View trip disabled, with a hint, until every day is finalized", () => {
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>View trip/);
    expect(html).toContain("Finalize all 3 days to view your trip.");
    expect(html).toContain("Plan a new trip");
    expect(html).not.toContain("Start over");

    const reduce = tripReducer(PLACES);
    const done = [0, 1, 2]
      .map((day) => ({ type: "finalize", day }) as const)
      .reduce(reduce, trip);
    const finished = render(done);
    expect(finished).not.toMatch(/<button[^>]*disabled=""[^>]*>View trip/);
    expect(finished).not.toContain("Finalize all 3 days");
  });

  it("shows the open day's header and actions", () => {
    expect(html).toContain("Day 1 · Fri 6 Nov</h2>");
    // The generated city is selected and labelled in the list itself, not
    // added as an extra option.
    const city = trip.days[0].plan!.baseCity!;
    expect(html).toContain(
      `<option value="${city}" selected="">${city} · chosen for you</option>`,
    );
    expect(html).not.toContain(`<option value="${city}">`);
    expect(html.match(/chosen for you/g)).toHaveLength(1);
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

describe("<EditorPage> Place list", () => {
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

describe("<EditorPage> places on other days", () => {
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

describe("<EditorPage> map", () => {
  it("renders a placeholder outside the browser, so Leaflet never loads in Node", () => {
    expect(render(trip)).toContain("Loading map…");
  });
});

describe("<EditorPage> Place list heading", () => {
  it("puts the single 'All places' heading above the scrolling results", () => {
    const html = render(trip);
    const heading = html.indexOf("All places");
    const results = html.indexOf('class="place-list__results"');
    expect(heading).toBeGreaterThan(-1);
    expect(heading).toBeLessThan(results);
  });
});

describe("<EditorPage> narrow-screen parts", () => {
  const html = render(trip);

  it("has Schedule / Map / Add tabs, with Schedule shown first", () => {
    expect(html).toContain('data-tab="schedule"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>Schedule</);
    expect(html).toContain(">Map<");
    expect(html).toContain(">Add<");
  });

  it("has a bottom bar with the Warning count and Finalize", () => {
    expect(html).toContain('class="mobile-bar"');
    expect(html).toContain("✓ Finalize");
    expect(html).not.toContain("Regenerate");
  });

  it("offers two choices on an empty day", () => {
    const empty = createTrip(
      { startDate: "2026-11-06", prefs: DEFAULT_PREFERENCES, startEmpty: true },
      PLACES,
    );
    const page = render(empty);
    expect(page).toContain("Day 1 has no Stops yet.");
    expect(page).toContain("Suggest this day");
    expect(page).toContain("Add places →");
  });

  it("shows a 'Select area' placeholder when no city is chosen yet", () => {
    const empty = createTrip(
      { startDate: "2026-11-06", prefs: DEFAULT_PREFERENCES, startEmpty: true },
      PLACES,
    );
    const page = render(empty);
    expect(page).toContain("Select area");
    expect(page).not.toContain("Choose for me");
  });
});
