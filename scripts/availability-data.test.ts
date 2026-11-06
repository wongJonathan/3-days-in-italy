// Guards on the real clean dataset for availability: every seasonal note is a deliberate
// decision, every override parses, and the remaining unknowns are the ones we expect.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { seasonalNotes } from "../src/utils/availability/seasonal-notes.ts";
import type { CleanPlace } from "../src/utils/data/place.ts";
import { parseHours } from "../src/utils/hours/parse.ts";

const places = JSON.parse(
  readFileSync(
    new URL("../src/utils/data/italy-clean.json", import.meta.url),
    "utf8",
  ),
) as CleanPlace[];

describe("seasonal notes", () => {
  it("classifies every note in the dataset, with the exact current text", () => {
    const inData = Object.fromEntries(
      places
        .filter((p) => p.seasonal_notes)
        .map((p) => [p.id, p.seasonal_notes]),
    );
    const classified = Object.fromEntries(
      Object.entries(seasonalNotes).map(([id, n]) => [id, n.note]),
    );
    // Fails on a new note, a changed note, or a classification for a note that no longer exists.
    expect(classified).toEqual(inData);
  });

  it("uses only hours overrides the parser can read", () => {
    const overrides = Object.values(seasonalNotes)
      .flatMap((n) => n.rules)
      .flatMap((r) => (r.kind === "hours-in-months" ? [r.hours] : []));
    expect(overrides.length).toBeGreaterThan(0);
    overrides.forEach((hours) => {
      expect(parseHours(hours).kind).toBe("weekly");
    });
  });

  it("uses valid month numbers", () => {
    Object.values(seasonalNotes)
      .flatMap((n) => n.rules)
      .forEach((rule) => {
        if (rule.kind === "months" || rule.kind === "hours-in-months") {
          expect([rule.from, rule.to].every((m) => m >= 1 && m <= 12)).toBe(
            true,
          );
        }
      });
  });
});

describe("hours status", () => {
  it("gives every place an Hours Status", () => {
    expect(
      places.every((p) =>
        ["known", "assumed", "unknown"].includes(p.hours_status),
      ),
    ).toBe(true);
  });

  it("leaves no place with unknown hours", () => {
    expect(
      places.filter((p) => p.hours_status === "unknown").map((p) => p.id),
    ).toEqual([]);
  });

  it("gives every place a visit duration", () => {
    expect(
      places.filter((p) => p.duration_minutes === null).map((p) => p.id),
    ).toEqual([]);
  });
});
