// Smoke test: renders the Trip Overview for a real, fully finalized Trip (no
// browser needed). The scroll maths is unit-tested in overview/overview.test.ts.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PLACES } from "../../../utils/data/places.ts";
import { DEFAULT_PREFERENCES } from "../../../utils/preferences/preferences.ts";
import { createTrip, tripReducer, type Trip } from "../../../stores/trip.ts";
import { OverviewPage } from "../OverviewPage.tsx";

const render = (trip: Trip) =>
  renderToStaticMarkup(
    <OverviewPage
      kind="own"
      trip={trip}
      places={PLACES}
      onEdit={() => {}}
      onNewTrip={() => {}}
    />,
  );

const reduce = tripReducer(PLACES);
const finalizeAll = (trip: Trip) =>
  [0, 1, 2]
    .map((day) => ({ type: "finalize", day }) as const)
    .reduce(reduce, trip);

// Friday 6 November 2026, three generated days, all finalized.
const trip = finalizeAll(
  createTrip(
    {
      startDate: "2026-11-06",
      prefs: { ...DEFAULT_PREFERENCES, lunch: true },
      startEmpty: false,
    },
    PLACES,
  ),
);

describe("<OverviewPage>", () => {
  const html = render(trip);

  it("shows the trip's dates and its actions", () => {
    expect(html).toContain("Your trip");
    expect(html).toContain("Fri 6 Nov – Sun 8 Nov");
    expect(html).toContain("Share link");
    expect(html).toContain("Edit this trip");
    expect(html).toContain("Plan a new trip");
  });

  it("shows every day in one scroll, with its date, city and Stop count", () => {
    trip.days.forEach((day, i) => {
      expect(html).toContain(`data-overview-day="${i}"`);
      expect(html).toContain(`· ${day.plan!.baseCity}`);
      expect(html).toContain(`· ${day.plan!.stops.length} Stops`);
    });
    expect(html).toContain("Day 1 · Fri 6 Nov");
    expect(html).toContain("Day 3 · Sun 8 Nov");
    const total = trip.days.reduce((n, d) => n + d.plan!.stops.length, 0);
    expect(html.match(/data-overview-stop=/g)).toHaveLength(total);
  });

  it("shows the Stops read-only, with times and travel estimates", () => {
    expect(html).toContain("(est.)");
    expect(html).toContain("Lunch");
    expect(html).not.toContain("Remove");
    expect(html).not.toContain("Move ");
  });

  it("highlights the first Stop of Day 1 to start with", () => {
    const firstId = trip.days[0].plan!.stops[0].placeId;
    const name = PLACES.find((p) => p.id === firstId)!.name;
    const highlighted = html.match(/<article[^>]*aria-current="true"[^>]*>/g);
    expect(highlighted).toHaveLength(1);
    expect(highlighted![0]).toContain(`aria-label="Stop 1: ${name}"`);
  });

  it("lets every Stop card be selected from the keyboard as well as by click", () => {
    const cards = html.match(/<article[^>]*>/g)!;
    const total = trip.days.reduce((n, d) => n + d.plan!.stops.length, 0);
    expect(cards).toHaveLength(total);
    cards.forEach((card) => expect(card).toContain('tabindex="0"'));
  });

  it("says when a finalized day has nothing planned", () => {
    const empty = finalizeAll(
      createTrip(
        {
          startDate: "2026-11-06",
          prefs: DEFAULT_PREFERENCES,
          startEmpty: true,
        },
        PLACES,
      ),
    );
    const out = render(empty);
    expect(out.match(/Nothing planned/g)).toHaveLength(3);
    expect(out).toContain("0 Stops");
  });

  it("shows a Shared Trip read-only, with only a way to plan your own", () => {
    const shared = renderToStaticMarkup(
      <OverviewPage
        kind="shared"
        trip={trip}
        places={PLACES}
        onPlanOwn={() => {}}
      />,
    );
    expect(shared).toContain("Shared trip");
    expect(shared).toContain("Fri 6 Nov – Sun 8 Nov");
    expect(shared).toContain("Plan your own trip");
    expect(shared).not.toContain("Your trip");
    expect(shared).not.toContain("Share link");
    expect(shared).not.toContain("Edit this trip");
    expect(shared).not.toContain("Plan a new trip");
  });
});
