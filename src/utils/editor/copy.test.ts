import { describe, expect, it } from "vitest";
import type { PlannedStop } from "../generator/generate-day.ts";
import {
  countLabel,
  emptyGroupText,
  formatDuration,
  groupTitle,
  hoursLabel,
  reasonLabel,
  regenerateHint,
  travelLabel,
  warningText,
} from "./copy.ts";

const t = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

describe("countLabel", () => {
  it("uses the singular only for exactly one", () => {
    expect(countLabel(1, "Warning")).toBe("1 Warning");
    expect(countLabel(0, "Warning")).toBe("0 Warnings");
    expect(countLabel(3, "Stop")).toBe("3 Stops");
  });
});

describe("formatDuration", () => {
  it("uses minutes under an hour, then hours and minutes", () => {
    expect(formatDuration(25)).toBe("25 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(63)).toBe("1 h 03");
    expect(formatDuration(160)).toBe("2 h 40");
  });
});

describe("travelLabel", () => {
  const travel = (
    band: "walk" | "in-city" | "regional" | "intercity",
    minutes: number,
    mode: "public-transport" | "rental-car" = "public-transport",
  ) => ({ band, minutes, km: 1, mode });

  it("names how you get there, always as an estimate", () => {
    expect(travelLabel(travel("walk", 10))).toBe("Walk ~10 min (est.)");
    expect(travelLabel(travel("in-city", 29))).toBe(
      "Local transit ~29 min (est.)",
    );
    expect(travelLabel(travel("intercity", 160))).toBe(
      "Train or bus ~2 h 40 (est.)",
    );
    expect(travelLabel(travel("regional", 44, "rental-car"))).toBe(
      "Drive ~44 min (est.)",
    );
  });

  it("walks short hops even with a rental car", () => {
    expect(travelLabel(travel("walk", 8, "rental-car"))).toBe(
      "Walk ~8 min (est.)",
    );
  });
});

describe("warningText", () => {
  const context = { date: "2026-11-09", rules: [] }; // a Monday

  it("says which weekday a Place is closed", () => {
    expect(warningText({ kind: "closed", reason: "weekday" }, context)).toBe(
      "Closed on Mondays.",
    );
  });

  it("says when a seasonal Place is open, from its Seasonal Rule", () => {
    expect(
      warningText(
        { kind: "closed", reason: "season" },
        { ...context, rules: [{ kind: "months", from: 4, to: 10 }] },
      ),
    ).toBe("Closed for the season. Open April–October.");
    expect(
      warningText(
        { kind: "closed", reason: "season" },
        { ...context, rules: [{ kind: "nth-weekend", n: 3 }] },
      ),
    ).toBe("Closed today. Only open on the 3rd weekend of the month.");
  });

  it("states the times for closing problems", () => {
    expect(
      warningText(
        {
          kind: "closed-on-arrival",
          arrivesAt: t("13:00"),
          closedAt: t("12:00"),
        },
        context,
      ),
    ).toBe("You arrive at 13:00, but it closes at 12:00.");
    expect(
      warningText(
        { kind: "past-closing", endsAt: t("19:30"), closesAt: t("18:50") },
        context,
      ),
    ).toBe("Your visit runs to 19:30, but it closes at 18:50.");
  });

  it("explains long travel", () => {
    expect(
      warningText(
        { kind: "long-travel", minutes: 160, reason: "over-limit" },
        context,
      ),
    ).toBe("~2 h 40 of travel from the previous Stop (est.).");
    expect(
      warningText(
        { kind: "long-travel", minutes: 25, reason: "longer-than-visit" },
        context,
      ),
    ).toBe("Getting here (~25 min, est.) takes longer than the visit.");
  });

  it("says when the day runs past its window", () => {
    expect(
      warningText(
        { kind: "past-day-window", endsAt: t("23:10"), windowEnd: t("22:30") },
        context,
      ),
    ).toBe("Your day now ends at 23:10, after your 22:30 end time.");
  });
});

describe("hoursLabel", () => {
  it("shows today's hours with the Hours Status", () => {
    expect(
      hoursLabel(
        { hours: "9:00-19:00", hours_status: "known" },
        {
          kind: "open",
          ranges: [{ open: t("9:00"), close: t("19:00") }],
          hoursStatus: "known",
        },
      ),
    ).toBe("Hours known · 09:00–19:00");
  });

  it("shows split hours and times past midnight", () => {
    expect(
      hoursLabel(
        { hours: "x", hours_status: "known" },
        {
          kind: "open",
          ranges: [
            { open: t("12:00"), close: t("14:30") },
            { open: t("19:30"), close: t("26:00") },
          ],
          hoursStatus: "known",
        },
      ),
    ).toBe("Hours known · 12:00–14:30, 19:30–02:00");
  });

  it("says 'open all day' for always-accessible places", () => {
    expect(
      hoursLabel(
        { hours: "Daily 0:00-24:00", hours_status: "assumed" },
        {
          kind: "open",
          ranges: [{ open: 0, close: 1440 }],
          hoursStatus: "assumed",
        },
      ),
    ).toBe("Hours assumed · open all day");
  });

  it("quotes the source for vague hours", () => {
    expect(
      hoursLabel(
        { hours: "Evenings", hours_status: "assumed" },
        {
          kind: "open",
          ranges: [{ open: t("18:00"), close: t("24:00") }],
          hoursStatus: "assumed",
        },
      ),
    ).toBe('Hours assumed: "Evenings" · 18:00–00:00');
  });

  it("says closed today, or unknown", () => {
    expect(
      hoursLabel(
        { hours: "Tue-Sun 9:00-18:00", hours_status: "known" },
        { kind: "closed", reason: "weekday" },
      ),
    ).toBe("Hours known · closed today");
    expect(
      hoursLabel({ hours: null, hours_status: "unknown" }, { kind: "unknown" }),
    ).toBe("Hours unknown");
  });
});

describe("reasonLabel", () => {
  it("names each reason", () => {
    expect(reasonLabel({ kind: "must-see", points: 100 })).toBe("Must-See");
    expect(
      reasonLabel({ kind: "interest", interest: "hidden-gem", points: 10 }),
    ).toBe("Hidden Gem");
    expect(reasonLabel({ kind: "rating", rating: 4.8, points: 8 })).toBe(
      "★ 4.8",
    );
    expect(reasonLabel({ kind: "quiet", points: 6 })).toBe("Quiet");
  });
});

describe("regenerateHint", () => {
  const stop = (origin: PlannedStop["origin"]): PlannedStop => ({
    placeId: origin,
    origin,
    meal: null,
  });

  it("says what Regenerate replaces and what it keeps", () => {
    expect(
      regenerateHint([
        stop("generated"),
        stop("generated"),
        stop("generated"),
        stop("must-see"),
        stop("added"),
      ]),
    ).toBe("Replaces 3 suggested Stops, keeps 2.");
    expect(regenerateHint([stop("generated"), stop("added")])).toBe(
      "Replaces 1 suggested Stop, keeps 1.",
    );
  });

  it("offers to suggest a day when there is nothing to replace", () => {
    expect(regenerateHint([])).toBe("Suggests Stops for this day.");
  });
});

describe("groupTitle / emptyGroupText", () => {
  it("names each budget group around the target", () => {
    expect(groupTitle("within", "€€")).toBe("Around €€ · your budget");
    expect(groupTitle("a-little-under", "€€")).toBe("A little under · €");
    expect(groupTitle("a-little-over", "€€")).toBe("A little over · €€€");
    expect(groupTitle("other", "€€")).toBe("Other prices");
    expect(groupTitle("all", null)).toBe("All places");
  });

  it("explains empty groups at the ends of the scale", () => {
    expect(groupTitle("a-little-under", "€")).toBe("A little under");
    expect(emptyGroupText("a-little-under", "€")).toBe(
      "Nothing is cheaper than €.",
    );
    expect(emptyGroupText("a-little-over", "€€€€")).toBe(
      "Nothing costs more than €€€€.",
    );
    expect(emptyGroupText("within", "€€")).toBe("None match right now.");
  });
});
