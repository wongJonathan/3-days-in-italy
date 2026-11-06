import type { Place } from "./place.ts";

/**
 * Where a correction came from:
 * - manual:     a person researched it.
 * - assumption: inferred from what kind of Place it is (e.g. an open square has no hours).
 * - ai-draft:   proposed by an AI; NOT applied until a person sets `approved: true`.
 */
export type CorrectionSource = "manual" | "assumption" | "ai-draft";

type CorrectableField = Exclude<keyof Place, "id">;

/**
 * Pairs each field name with that field's own value type, so
 * `{ field: 'longitude', value: 'abc' }` is a compile error.
 */
type FieldValue = {
  [K in CorrectableField]: { field: K; value: Place[K] };
}[CorrectableField];

export type Correction = FieldValue & {
  placeId: string;
  reason: string;
  source: CorrectionSource;
  /** Only meaningful for ai-draft corrections. */
  approved?: boolean;
};

/** Drops a whole Place from the clean dataset (e.g. it doesn't exist). */
export type Removal = {
  placeId: string;
  reason: string;
  source: CorrectionSource;
  /** Only meaningful for ai-draft removals. */
  approved?: boolean;
};

/**
 * Estimated hours from the research in docs/data/missing-fields.md.
 * Source 'assumption', so these Places get Hours Status "assumed".
 * Day trips and outdoor activities use the fixed MVP daylight window, 8:00-19:00.
 */
const assumedHours = (): Correction[] => {
  const OPEN_SPACE = "Daily 0:00-24:00";
  const DAYLIGHT = "Daily 8:00-19:00";
  const estimates: [placeId: string, hours: string, reason: string][] = [
    [
      "place_002",
      OPEN_SPACE,
      "Neighborhood: public streets, always accessible.",
    ],
    ["place_008", OPEN_SPACE, "Public piazza, always accessible."],
    [
      "place_013",
      OPEN_SPACE,
      "Neighborhood: public streets, always accessible.",
    ],
    [
      "place_014",
      OPEN_SPACE,
      "Keyhole on a gate facing a public piazza; viewable at any hour.",
    ],
    [
      "place_019",
      OPEN_SPACE,
      "Public staircase, open at all hours (sitting is banned).",
    ],
    ["place_023", OPEN_SPACE, "Public piazza, always accessible."],
    ["place_027", OPEN_SPACE, "Public square and terrace, always accessible."],
    [
      "place_028",
      OPEN_SPACE,
      "Neighborhood: public streets, always accessible.",
    ],
    ["place_049", OPEN_SPACE, "Public covered walkways, always accessible."],
    ["place_052", OPEN_SPACE, "Public piazza, always accessible."],
    [
      "place_057",
      OPEN_SPACE,
      "Public canal-side streets; bars keep their own hours.",
    ],
    [
      "place_060",
      OPEN_SPACE,
      "The arcade is a public passage, open at all hours; shops ~10:00-19:30.",
    ],
    ["place_066", OPEN_SPACE, "Public bridge, always accessible."],
    [
      "place_072",
      OPEN_SPACE,
      "Neighborhood: public streets, always accessible.",
    ],
    [
      "place_075",
      OPEN_SPACE,
      "Neighborhood: public streets; the name suggests going early.",
    ],
    [
      "place_084",
      OPEN_SPACE,
      "Public bridge, always accessible; shops ~10:00-19:00.",
    ],
    ["place_085", OPEN_SPACE, "Public lakefront, always accessible."],
    [
      "place_093",
      OPEN_SPACE,
      "Viewing the exterior from the public piazza, always accessible.",
    ],
    ["place_097", OPEN_SPACE, "Public promenade; no source confirms hours."],
    [
      "place_077",
      "Daily 9:00-22:00",
      "Same as Trevi Fountain (place_018): the ticketed basin area is open 9:00-22:00.",
    ],
    [
      "place_080",
      DAYLIGHT,
      "Park grounds open roughly dawn to dusk; no official hours found.",
    ],
    [
      "place_102",
      "Daily 10:00-19:00",
      "The shops are the point; typical boutique hours.",
    ],
    [
      "place_021",
      "Daily 9:30-17:00",
      "Bike rental hours; the earlier of two reported closing times.",
    ],
    [
      "place_035",
      "Daily 9:00-17:00",
      "Guided tours from Florence start around 9:00 and last 6-7 hours.",
    ],
    ["place_038", DAYLIGHT, "Day trip: limited by daylight and transport."],
    ["place_063", DAYLIGHT, "Day trip: limited by daylight and ferry times."],
    [
      "place_070",
      DAYLIGHT,
      "Day trip: the vaporetto runs all day; limited by daylight.",
    ],
    ["place_089", DAYLIGHT, "Day trip: limited by daylight and transport."],
    [
      "place_100",
      "Daily 18:00-23:00",
      'Raw value "Evenings". Typical aperitivo hours.',
    ],
    [
      "place_006",
      "Mon-Sat 7:00-14:00",
      'Raw value "Morning only". Several guides: Mon-Sat, about 7:00-14:00, closed Sunday.',
    ],
    [
      "place_037",
      "Tue-Sun 19:30-02:00",
      'Raw value "Evenings". Sources disagree (daily vs. closed Monday); the stricter one is used.',
    ],
    [
      "place_044",
      "Daily 9:30-17:30",
      "Acetaia Giusti runs 1-hour tours daily, 9:30-16:30.",
    ],
    [
      "place_053",
      "Mon-Fri 8:30-14:30",
      "Dairy visits happen weekday mornings; includes lunch after.",
    ],
    [
      "place_068",
      "Daily 18:00-22:30",
      'Raw value "Evenings". Typical bacaro evening hours.',
    ],
    [
      "place_071",
      "Daily 9:00-19:00",
      "The official daytime gondola rate applies 9:00-19:00.",
    ],
  ];
  return estimates.map(([placeId, value, reason]) => ({
    placeId,
    field: "hours",
    value,
    reason,
    source: "assumption",
  }));
};

/** Estimated visit lengths for open spaces with no duration (docs/data/missing-fields.md). */
const assumedDurations = (): Correction[] => {
  const estimates: [placeId: string, minutes: number][] = [
    ["place_014", 15],
    ["place_023", 30],
    ["place_027", 45],
    ["place_052", 45],
    ["place_066", 20],
    ["place_077", 30],
    ["place_085", 60],
    ["place_093", 30],
    ["place_097", 60],
  ];
  return estimates.map(([placeId, value]) => ({
    placeId,
    field: "duration_minutes",
    value,
    reason: "Estimated visit length for an open space.",
    source: "assumption",
  }));
};

/**
 * Every hand-made fix to italy.json. The raw file is never edited; run
 * `npm run data:clean` after changing this list to regenerate
 * src/utils/data/italy-clean.json and docs/data/corrections-review.md.
 */
export const corrections: Correction[] = [
  {
    placeId: "place_059",
    field: "latitude",
    value: 45.4703,
    reason:
      "Brera Antique Market: verified on a map at 45°28′13.1″N 9°11′06.8″E; raw latitude was ~230 m off.",
    source: "manual",
  },
  {
    placeId: "place_059",
    field: "longitude",
    value: 9.1852,
    reason:
      "Brera Antique Market: raw longitude 11.191 is ~150 km east of Milan. Verified on a map at 45°28′13.1″N 9°11′06.8″E.",
    source: "manual",
  },
  {
    placeId: "place_020",
    field: "booking_required",
    value: false,
    reason:
      "Il Sorpasso: value missing. Researched: walk-in bar/bistro, no reservation needed.",
    source: "manual",
  },
  {
    placeId: "place_018",
    field: "hours",
    value: "Daily 9:00-22:00",
    reason:
      "Trevi Fountain: since Feb 2026 the basin area is ticketed (€2, walk-up) 9:00-22:00. Source: turismoroma.it/en/node/168455.",
    source: "manual",
  },
  {
    placeId: "place_037",
    field: "booking_required",
    value: true,
    reason:
      "Rasputin: a speakeasy cocktail bar; reservation needed. Source: enprimeurclub.com/guide/best-cocktail-bars-in-florence.",
    source: "manual",
  },
  {
    placeId: "place_063",
    field: "seasonal_notes",
    value:
      "Ferries run less often in winter. Summer weekends extremely crowded.",
    reason:
      'Bellagio: the town is open all year; only the ferry service shrinks in winter (raw note said "Open April-October only").',
    source: "manual",
  },
  {
    placeId: "place_090",
    field: "hours",
    value:
      "Mon-Thu 11:30-14:30, 18:30-24:00, Fri 11:30-14:30, 18:30-01:00, Sat 11:00-15:00, 18:00-01:00, Sun 10:00-15:00, 18:00-23:00",
    reason:
      "Isola della Scala Risotto Festival: the festival's published daily schedule, provided by the project owner.",
    source: "manual",
  },
  {
    placeId: "place_085",
    field: "seasonal_notes",
    value: "Best April-October.",
    reason:
      'Como Town Lakefront: a public lakefront is open all year (raw note said "Open April-October only"). Same fix as Bellagio.',
    source: "manual",
  },
  ...assumedHours(),
  ...assumedDurations(),
];

/** Places dropped from the clean dataset entirely. */
export const removals: Removal[] = [
  {
    placeId: "place_079",
    reason:
      "Prosciutto e Melone at Cremeria Mascareta: no such venue found. The description matches Enoteca Mascareta, a different (wine bar) place.",
    source: "manual",
  },
];
