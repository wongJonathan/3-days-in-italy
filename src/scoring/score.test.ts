import { describe, expect, it } from "vitest";
import {
  chipsFor,
  rankPlaces,
  scorePlace,
  type ScoredPlaceInput,
  type ScoringPreferences,
} from "./score.ts";

const place = (
  id: string,
  overrides: Partial<ScoredPlaceInput> = {},
): ScoredPlaceInput => ({ id, rating: 4.0, tags: [], ...overrides });

const NONE: ScoringPreferences = { interests: [], mustSees: [] };
const prefs = (p: Partial<ScoringPreferences>): ScoringPreferences => ({
  ...NONE,
  ...p,
});

const pointsOf = (p: ScoredPlaceInput, pr: ScoringPreferences): number => {
  const score = scorePlace(p, pr);
  if (score.kind !== "scored") throw new Error("expected a scored place");
  return score.points;
};

describe("scorePlace", () => {
  describe("rating", () => {
    it("scores (rating - 4.0) x 10 with no Preferences", () => {
      expect(scorePlace(place("a", { rating: 4.8 }), NONE)).toEqual({
        kind: "scored",
        points: 8,
        reasons: [{ kind: "rating", rating: 4.8, points: 8 }],
      });
    });

    it("avoids floating-point noise in rating points (4.7 → 7, not 7.000000000000002)", () => {
      expect(pointsOf(place("a", { rating: 4.7 }), NONE)).toBe(7);
    });

    it("keeps a place rated exactly 4.0, with 0 rating points", () => {
      expect(pointsOf(place("a", { rating: 4.0 }), NONE)).toBe(0);
    });

    it("excludes a place rated under 4.0", () => {
      expect(scorePlace(place("a", { rating: 3.9 }), NONE)).toEqual({
        kind: "excluded",
        reason: "low-rating",
      });
    });

    it("keeps a low-rated place that is a Must-See", () => {
      const score = scorePlace(
        place("a", { rating: 2.1 }),
        prefs({ mustSees: ["a"] }),
      );
      expect(score.kind).toBe("scored");
    });
  });

  describe("Interests", () => {
    it("adds 10 points per chosen Interest the place matches", () => {
      const p = place("a", { tags: ["food", "wine", "historic"] });
      expect(pointsOf(p, prefs({ interests: ["food", "wine"] }))).toBe(20);
    });

    it("counts a chip once even when several of its tags match", () => {
      // Scenic matches scenic, views and photogenic.
      const p = place("a", { tags: ["scenic", "views", "photogenic"] });
      expect(pointsOf(p, prefs({ interests: ["scenic"] }))).toBe(10);
    });

    it("maps chips to their dataset tags (Markets → market)", () => {
      const p = place("a", { tags: ["market"] });
      expect(pointsOf(p, prefs({ interests: ["markets"] }))).toBe(10);
    });

    it("ignores Interests the traveler did not choose", () => {
      const p = place("a", { tags: ["food"] });
      expect(pointsOf(p, prefs({ interests: ["art"] }))).toBe(0);
    });
  });

  describe("Avoid Crowds", () => {
    const avoid = prefs({ interests: ["avoid-crowds"] });

    it("raises quiet places and hidden gems", () => {
      expect(pointsOf(place("a", { tags: ["quiet"] }), avoid)).toBe(6);
      expect(pointsOf(place("a", { tags: ["hidden-gem"] }), avoid)).toBe(6);
      expect(
        pointsOf(place("a", { tags: ["quiet", "hidden-gem"] }), avoid),
      ).toBe(6);
    });

    it("lowers tourist-heavy places", () => {
      expect(pointsOf(place("a", { tags: ["tourist-heavy"] }), avoid)).toBe(
        -12,
      );
    });

    it("does nothing when not chosen", () => {
      expect(pointsOf(place("a", { tags: ["tourist-heavy"] }), NONE)).toBe(0);
    });
  });

  it("adds 100 points for a Must-See", () => {
    expect(pointsOf(place("a"), prefs({ mustSees: ["a"] }))).toBe(100);
  });

  it("adds up every reason, and the reasons explain the total", () => {
    const p = place("a", {
      rating: 4.5,
      tags: ["food", "tourist-heavy", "iconic"],
    });
    const score = scorePlace(
      p,
      prefs({ interests: ["food", "iconic", "avoid-crowds"], mustSees: ["a"] }),
    );
    if (score.kind !== "scored") throw new Error("expected scored");
    expect(score.points).toBe(100 + 10 + 10 + 5 - 12);
    expect(score.reasons.reduce((sum, r) => sum + r.points, 0)).toBe(
      score.points,
    );
  });
});

describe("chipsFor", () => {
  it("shows positive reasons, biggest first", () => {
    const score = scorePlace(
      place("a", { rating: 4.9, tags: ["food", "tourist-heavy"] }),
      prefs({ interests: ["food", "avoid-crowds"], mustSees: ["a"] }),
    );
    expect(chipsFor(score).map((r) => r.kind)).toEqual([
      "must-see",
      "interest",
      "rating",
    ]);
  });

  it("shows the rating chip only for highly rated places (4.7 or above)", () => {
    expect(chipsFor(scorePlace(place("a", { rating: 4.6 }), NONE))).toEqual([]);
    expect(
      chipsFor(scorePlace(place("a", { rating: 4.7 }), NONE)).map(
        (r) => r.kind,
      ),
    ).toEqual(["rating"]);
  });

  it("has no chips for an excluded place", () => {
    expect(chipsFor(scorePlace(place("a", { rating: 2 }), NONE))).toEqual([]);
  });
});

describe("rankPlaces", () => {
  it("sorts by points, highest first, and drops excluded places", () => {
    const ranked = rankPlaces(
      [
        place("low", { rating: 3.5 }),
        place("ok", { rating: 4.2 }),
        place("food", { rating: 4.1, tags: ["food"] }),
      ],
      prefs({ interests: ["food"] }),
    );
    expect(ranked.map((r) => r.place.id)).toEqual(["food", "ok"]);
  });

  it("breaks ties by rating, then by id, so the order never changes between runs", () => {
    const ranked = rankPlaces(
      [
        place("b", { rating: 4.5, tags: ["food"] }),
        place("a", { rating: 4.5, tags: ["food"] }),
        place("c", { rating: 4.0, tags: ["food", "wine"] }), // 20 points, beats 15
      ],
      prefs({ interests: ["food", "wine"] }),
    );
    expect(ranked.map((r) => r.place.id)).toEqual(["c", "a", "b"]);
  });

  it("keeps the full place object, so callers get their own type back", () => {
    const full = { ...place("a", { rating: 4.5 }), name: "Somewhere" };
    expect(rankPlaces([full], NONE)[0].place).toBe(full);
  });
});
