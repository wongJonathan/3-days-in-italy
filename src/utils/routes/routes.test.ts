import { describe, expect, it } from "vitest";
import { createTrip, tripReducer, type Trip } from "../../stores/trip.ts";
import { PLACES } from "../data/places.ts";
import { DEFAULT_PREFERENCES } from "../preferences/preferences.ts";
import { redirectFor, ROUTES } from "./routes.ts";

const reduce = tripReducer(PLACES);
const inProgress = createTrip(
  { startDate: "2026-11-06", prefs: DEFAULT_PREFERENCES, startEmpty: false },
  PLACES,
);
const finalized: Trip = [0, 1, 2]
  .map((day) => ({ type: "finalize", day }) as const)
  .reduce(reduce, inProgress);

describe("redirectFor", () => {
  it("shows onboarding at / when there is no Trip", () => {
    expect(redirectFor(ROUTES.home, null)).toBeNull();
  });

  it("sends / to the editor, or to the overview once every day is finalized", () => {
    expect(redirectFor(ROUTES.home, inProgress)).toBe(ROUTES.plan);
    expect(redirectFor(ROUTES.home, finalized)).toBe(ROUTES.overview);
  });

  it("sends /plan to onboarding when there is no Trip", () => {
    expect(redirectFor(ROUTES.plan, null)).toBe(ROUTES.home);
    expect(redirectFor(ROUTES.plan, inProgress)).toBeNull();
    expect(redirectFor(ROUTES.plan, finalized)).toBeNull();
  });

  it("only opens /overview for a fully finalized Trip", () => {
    expect(redirectFor(ROUTES.overview, finalized)).toBeNull();
    expect(redirectFor(ROUTES.overview, inProgress)).toBe(ROUTES.plan);
    expect(redirectFor(ROUTES.overview, null)).toBe(ROUTES.home);
  });
});
