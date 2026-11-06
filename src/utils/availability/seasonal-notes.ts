import type { SeasonalRule } from "./seasonal.ts";

/**
 * How each Place's free-text seasonal note is handled.
 * - `rules` not empty: the note becomes Seasonal Rules the planner enforces.
 * - `rules` empty:     advice only, shown to the traveler but never enforced.
 * `note` must match the dataset text exactly; a test fails if a note is
 * added, changed or missed, so every note is a deliberate decision.
 */
export type SeasonalNote = {
  note: string;
  rules: SeasonalRule[];
  why: string;
};

export const seasonalNotes: Record<string, SeasonalNote> = {
  place_001: {
    note: "Summer queues can be brutal — pre-book online always.",
    rules: [],
    why: "Advice about crowds and booking; no change to when it is open.",
  },
  place_010: {
    note: "Closed Sundays except last Sunday of the month (free entry, massive crowds).",
    rules: [],
    why: "The hours already close it on Sundays. The last-Sunday opening is left out on purpose: missing one open day is safer than inventing its hours.",
  },
  place_021: {
    note: "Best April-October. Road closed to cars on Sundays only.",
    rules: [],
    why: "Both parts are advice: 'best' is not 'only', and the car-free Sunday makes Sunday nicer, not required.",
  },
  place_026: {
    note: "Booking essential April-October.",
    rules: [],
    why: "About booking, not opening. Booking is shown separately.",
  },
  place_034: {
    note: "Summer hours extend to 19:30. Can be brutally hot July-August.",
    rules: [{ kind: "hours-in-months", from: 6, to: 8, hours: "8:15-19:30" }],
    why: "'Summer' read as June-August, the conservative choice. The heat warning is advice.",
  },
  place_035: {
    note: "Open April-October only. Best in September during harvest season.",
    rules: [{ kind: "months", from: 4, to: 10 }],
    why: "'Only' is a hard limit. 'Best in September' is advice.",
  },
  place_053: {
    note: "Tours run weekday mornings only — plan ahead.",
    rules: [],
    why: "Already enforced by its hours (Mon-Fri 8:30-14:30), so no extra rule is needed.",
  },
  place_056: {
    note: "Tickets frequently sell out 2 months in advance.",
    rules: [],
    why: "Advice about booking early.",
  },
  place_057: {
    note: "Best May-September when canal-side seating is open.",
    rules: [],
    why: "'Best' is advice; the canals are there all year.",
  },
  place_059: {
    note: "Third weekend of each month only.",
    rules: [{ kind: "nth-weekend", n: 3 }],
    why: "'Third weekend' read as the 3rd Saturday of the month and the Sunday after it.",
  },
  place_063: {
    note: "Ferries run less often in winter. Summer weekends extremely crowded.",
    rules: [],
    why: "The town is open all year (corrected note); both parts are advice.",
  },
  place_064: {
    note: "Open April-October only.",
    rules: [{ kind: "months", from: 4, to: 10 }],
    why: "A hard seasonal limit.",
  },
  place_065: {
    note: "Rooftop open May-September only.",
    rules: [{ kind: "months", from: 5, to: 9 }],
    why: "The Place is the rooftop aperitivo, so it follows the rooftop's season.",
  },
  place_085: {
    note: "Best April-October.",
    rules: [],
    why: "'Best' is advice; the lakefront is public and open all year (corrected note).",
  },
  place_090: {
    note: "October only — check exact festival dates before planning.",
    rules: [{ kind: "months", from: 10, to: 10 }],
    why: "Kept as written (decided 2026-11-05). The 2026 festival actually starts 17 September.",
  },
  place_095: {
    note: "Best April-October.",
    rules: [],
    why: "'Best' is advice; the garden is open all year.",
  },
};

export const rulesFor = (placeId: string): SeasonalRule[] =>
  seasonalNotes[placeId]?.rules ?? [];
