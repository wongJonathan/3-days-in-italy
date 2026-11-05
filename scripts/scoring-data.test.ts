// Guards on the real clean dataset for scoring: no Interest chip is dead weight.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CleanPlace } from "../src/data/place.ts";
import { INTEREST_TAGS } from "../src/preferences/interests.ts";

const places = JSON.parse(
  readFileSync(
    new URL("../src/data/italy-clean.json", import.meta.url),
    "utf8",
  ),
) as CleanPlace[];

const allTags = new Set(places.flatMap((p) => p.tags));

describe("Interest chips", () => {
  it.each(Object.entries(INTEREST_TAGS))(
    "%s matches at least one place",
    (_interest, { tags }) => {
      expect(tags.some((tag) => allTags.has(tag))).toBe(true);
    },
  );

  it("uses only tags that exist in the dataset (catches typos like `markets`)", () => {
    const unknown = Object.values(INTEREST_TAGS)
      .flatMap((chip) => chip.tags)
      .filter((tag) => !allTags.has(tag));
    expect(unknown).toEqual([]);
  });

  it("feeds Avoid Crowds from tags that exist", () => {
    ["quiet", "hidden-gem", "tourist-heavy"].forEach((tag) => {
      expect(allTags.has(tag)).toBe(true);
    });
  });
});
