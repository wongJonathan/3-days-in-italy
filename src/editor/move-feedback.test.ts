import { describe, expect, it } from "vitest";
import { moveAnnouncement } from "./move-feedback.ts";

describe("moveAnnouncement", () => {
  it("says where the Stop went and its new times", () => {
    expect(
      moveAnnouncement({
        name: "Pantheon",
        direction: "up",
        position: 2,
        total: 5,
        start: 679,
        end: 724,
      }),
    ).toBe("Pantheon moved up to stop 2 of 5, now 11:19–12:04.");
  });

  it("works for a move down", () => {
    expect(
      moveAnnouncement({
        name: "Colosseum",
        direction: "down",
        position: 5,
        total: 5,
        start: 900,
        end: 1020,
      }),
    ).toBe("Colosseum moved down to stop 5 of 5, now 15:00–17:00.");
  });
});
