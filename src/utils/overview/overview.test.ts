import { describe, expect, it } from "vitest";
import {
  dayHeading,
  pickActive,
  readingLine,
  scrollTargetFor,
} from "./overview.ts";

describe("readingLine", () => {
  it("sits a third of the way down the visible list area", () => {
    // Nothing pinned above the list: a third of the screen.
    expect(
      readingLine({ areaTop: 0, viewportHeight: 900, scrollY: 2000 }),
    ).toBe(300);
    // A 300px map pinned on top: a third of the 600px left under it.
    expect(
      readingLine({ areaTop: 300, viewportHeight: 900, scrollY: 2000 }),
    ).toBe(500);
  });

  it("starts at the top of the area and moves down as the page scrolls", () => {
    // Unscrolled, so the first Stop is highlighted even if the cards are short.
    expect(readingLine({ areaTop: 0, viewportHeight: 900, scrollY: 0 })).toBe(
      0,
    );
    expect(readingLine({ areaTop: 0, viewportHeight: 900, scrollY: 120 })).toBe(
      120,
    );
    expect(
      readingLine({ areaTop: 300, viewportHeight: 900, scrollY: 120 }),
    ).toBe(420);
  });
});

describe("pickActive", () => {
  it("is the last item whose top has reached the line", () => {
    expect(pickActive([-400, -50, 120, 600], 300, false)).toBe(2);
    expect(pickActive([-400, -50, 300, 600], 300, false)).toBe(2);
  });

  it("is the first item while nothing has reached the line yet", () => {
    expect(pickActive([350, 600], 300, false)).toBe(0);
  });

  it("is the last item at the bottom of the page", () => {
    expect(pickActive([-400, 200, 450, 600], 300, true)).toBe(3);
  });

  it("is -1 when there is nothing to pick", () => {
    expect(pickActive([], 300, false)).toBe(-1);
    expect(pickActive([], 300, true)).toBe(-1);
  });
});

describe("scrollTargetFor", () => {
  it("scrolls so the item's top lands just past the reading line", () => {
    // Item at 800px on screen, line at 300px, page scrolled 1000px:
    // scroll 501px more, so the item sits at 299px, 1px above the line.
    expect(scrollTargetFor({ itemTop: 800, line: 300, scrollY: 1000 })).toBe(
      1501,
    );
  });

  it("never asks for a negative scroll", () => {
    expect(scrollTargetFor({ itemTop: 20, line: 300, scrollY: 0 })).toBe(0);
  });
});

describe("dayHeading", () => {
  it("names the day, its date and its city", () => {
    expect(dayHeading(0, "2026-11-06", "Rome")).toBe(
      "Day 1 · Fri 6 Nov · Rome",
    );
  });

  it("leaves the city out when the day has none", () => {
    expect(dayHeading(2, "2026-11-08", null)).toBe("Day 3 · Sun 8 Nov");
  });
});
