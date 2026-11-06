import { isTripFinalized, type Trip } from "../../stores/trip.ts";

/**
 * The app's pages. Which day the editor shows stays in the Trip (`openDay`),
 * not in the URL.
 */
export const ROUTES = {
  /** Onboarding. */
  home: "/",
  /** The editor. */
  plan: "/plan",
  /** The traveler's own Trip Overview. */
  overview: "/overview",
  /** A Shared Trip, read-only, carried in the query string. */
  share: "/share",
} as const;

/** The pages that depend on the saved Trip. /share never does. */
export type GuardedRoute =
  typeof ROUTES.home | typeof ROUTES.plan | typeof ROUTES.overview;

/** Where a saved Trip belongs: the overview once every day is finalized. */
const pageFor = (trip: Trip | null) =>
  !trip ? ROUTES.home : isTripFinalized(trip) ? ROUTES.overview : ROUTES.plan;

export const redirectFor = (
  route: GuardedRoute,
  trip: Trip | null,
): string | null => {
  const ok =
    route === ROUTES.home
      ? !trip
      : route === ROUTES.plan
        ? trip !== null
        : trip !== null && isTripFinalized(trip);
  return ok ? null : pageFor(trip);
};
