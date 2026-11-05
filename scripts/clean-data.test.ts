// Integration tests against the real dataset. They guard the pipeline as a whole:
// the raw data stays valid input, and the committed outputs are never stale.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cleanPlaces } from "../src/data/clean.ts";
import { corrections, removals } from "../src/data/corrections.ts";
import type { Place } from "../src/data/place.ts";
import { renderReview } from "../src/data/review.ts";
import { parseHours } from "../src/hours/parse.ts";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

const raw = JSON.parse(read("italy.json")) as Place[];

describe("italy.json", () => {
  it("has unique place ids", () => {
    const ids = raw.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("cleaning the real dataset", () => {
  const { places, review } = cleanPlaces(raw, corrections, removals);

  it("keeps every raw place except removed ones, in the original order", () => {
    const removed = new Set(removals.map((r) => r.placeId));
    expect(places.map((p) => p.id)).toEqual(
      raw.map((p) => p.id).filter((id) => !removed.has(id)),
    );
  });

  it("leaves no underscore-spelled tags behind", () => {
    const allTags = places.flatMap((p) => p.tags);
    expect(allTags.filter((t) => t.includes("_"))).toEqual([]);
  });

  it("recognizes every hours format (add it to parseHours, or correct the value, if this fails)", () => {
    const unrecognized = places
      .map((p) => ({ id: p.id, parsed: parseHours(p.hours) }))
      .filter(({ parsed }) => parsed.kind === "unrecognized");
    expect(unrecognized).toEqual([]);
  });

  it("matches the committed italy-clean.json (run `npm run data:clean` if this fails)", () => {
    expect(JSON.parse(read("src/data/italy-clean.json"))).toEqual(places);
  });

  it("matches the committed review checklist (run `npm run data:clean` if this fails)", () => {
    expect(read("docs/data/corrections-review.md")).toBe(renderReview(review));
  });
});
