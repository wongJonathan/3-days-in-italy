import type { CleanPlace } from "../data/place.ts";
import { INTEREST_TAGS, type Interest } from "../preferences/interests.ts";

/** Places rated below this are left out, unless they are a Must-See. */
export const MIN_RATING = 4.0;
export const MUST_SEE_POINTS = 100;
export const INTEREST_POINTS = 10;
/** Points per rating step above MIN_RATING: 4.8 → (4.8 - 4.0) × 10 = 8. */
export const RATING_WEIGHT = 10;
/** A "Highly rated" chip is shown at this rating or above. */
export const HIGHLY_RATED = 4.7;
/** With Avoid Crowds: a `quiet` or `hidden-gem` place gets this once. */
export const QUIET_POINTS = 6;
/** With Avoid Crowds: a `tourist-heavy` place gets this. */
export const TOURIST_HEAVY_PENALTY = -12;

export type ScoredPlaceInput = Pick<CleanPlace, "id" | "rating" | "tags">;

/** The parts of the Preferences that scoring uses. */
export type ScoringPreferences = { interests: Interest[]; mustSees: string[] };

/**
 * One contribution to a score. Reasons with positive points become the
 * "why it's here" chips; the penalty is kept so the total can be explained.
 */
export type Reason =
  | { kind: "must-see"; points: number }
  | { kind: "interest"; interest: Interest; points: number }
  | { kind: "rating"; rating: number; points: number }
  | { kind: "quiet"; points: number }
  | { kind: "tourist-heavy"; points: number };

export type Score =
  | { kind: "excluded"; reason: "low-rating" }
  | { kind: "scored"; points: number; reasons: Reason[] };

/**
 * A deterministic score that adds up Interest matches, rating and Must-See.
 * Every point comes from a Reason, so the "why it's here" chips can never
 * disagree with the score.
 */
export const scorePlace = (
  place: ScoredPlaceInput,
  prefs: ScoringPreferences,
): Score => {
  const isMustSee = prefs.mustSees.includes(place.id);
  if (place.rating < MIN_RATING && !isMustSee) {
    return { kind: "excluded", reason: "low-rating" };
  }

  const tags = new Set(place.tags);
  const reasons: Reason[] = [];

  if (isMustSee) reasons.push({ kind: "must-see", points: MUST_SEE_POINTS });

  for (const interest of prefs.interests) {
    if (interest === "avoid-crowds") continue;
    if (INTEREST_TAGS[interest].tags.some((tag) => tags.has(tag))) {
      reasons.push({ kind: "interest", interest, points: INTEREST_POINTS });
    }
  }

  reasons.push({
    kind: "rating",
    rating: place.rating,
    // Rounded to one decimal so 4.7 gives 7, not 7.000000000000002.
    // Never negative: a low-rated Must-See isn't pushed down by its rating.
    points: Math.max(
      0,
      Math.round((place.rating - MIN_RATING) * RATING_WEIGHT * 10) / 10,
    ),
  });

  if (prefs.interests.includes("avoid-crowds")) {
    if (tags.has("quiet") || tags.has("hidden-gem")) {
      reasons.push({ kind: "quiet", points: QUIET_POINTS });
    }
    if (tags.has("tourist-heavy")) {
      reasons.push({ kind: "tourist-heavy", points: TOURIST_HEAVY_PENALTY });
    }
  }

  return {
    kind: "scored",
    points: reasons.reduce((sum, r) => sum + r.points, 0),
    reasons,
  };
};

/** The chips to show: positive reasons, biggest first. Rating only shows when it's high. */
export const chipsFor = (score: Score): Reason[] =>
  score.kind === "excluded"
    ? []
    : score.reasons
        .filter((r) => r.points > 0)
        .filter((r) => r.kind !== "rating" || r.rating >= HIGHLY_RATED)
        .sort((a, b) => b.points - a.points);

/**
 * Every eligible place, best first. Ties break by rating, then by id,
 * so the same input always gives the same order.
 */
export const rankPlaces = <P extends ScoredPlaceInput>(
  places: P[],
  prefs: ScoringPreferences,
): { place: P; points: number; reasons: Reason[] }[] =>
  places
    .flatMap((place) => {
      const score = scorePlace(place, prefs);
      return score.kind === "scored"
        ? [{ place, points: score.points, reasons: score.reasons }]
        : [];
    })
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.place.rating - a.place.rating ||
        a.place.id.localeCompare(b.place.id),
    );
