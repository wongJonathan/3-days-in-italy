import type { Place } from './place.ts'

/**
 * Where a correction came from:
 * - manual:     a person researched it.
 * - assumption: inferred from what kind of Place it is (e.g. an open square has no hours).
 * - ai-draft:   proposed by an AI; NOT applied until a person sets `approved: true`.
 */
export type CorrectionSource = 'manual' | 'assumption' | 'ai-draft'

type CorrectableField = Exclude<keyof Place, 'id'>

/**
 * Pairs each field name with that field's own value type, so
 * `{ field: 'longitude', value: 'abc' }` is a compile error.
 */
type FieldValue = {
  [K in CorrectableField]: { field: K; value: Place[K] }
}[CorrectableField]

export type Correction = FieldValue & {
  placeId: string
  reason: string
  source: CorrectionSource
  /** Only meaningful for ai-draft corrections. */
  approved?: boolean
}

/** Drops a whole Place from the clean dataset (e.g. it doesn't exist). */
export type Removal = {
  placeId: string
  reason: string
  source: CorrectionSource
  /** Only meaningful for ai-draft removals. */
  approved?: boolean
}

/**
 * Every hand-made fix to italy.json. The raw file is never edited; run
 * `npm run data:clean` after changing this list to regenerate
 * src/data/italy-clean.json and docs/data/corrections-review.md.
 */
export const corrections: Correction[] = [
  {
    placeId: 'place_059',
    field: 'latitude',
    value: 45.4703,
    reason: 'Brera Antique Market: verified on a map at 45°28′13.1″N 9°11′06.8″E; raw latitude was ~230 m off.',
    source: 'manual',
  },
  {
    placeId: 'place_059',
    field: 'longitude',
    value: 9.1852,
    reason: 'Brera Antique Market: raw longitude 11.191 is ~150 km east of Milan. Verified on a map at 45°28′13.1″N 9°11′06.8″E.',
    source: 'manual',
  },
  {
    placeId: 'place_020',
    field: 'booking_required',
    value: false,
    reason: 'Il Sorpasso: value missing. Researched: walk-in bar/bistro, no reservation needed.',
    source: 'manual',
  },
  {
    placeId: 'place_018',
    field: 'hours',
    value: 'Daily 9:00-22:00',
    reason: 'Trevi Fountain: since Feb 2026 the basin area is ticketed (€2, walk-up) 9:00-22:00. Source: turismoroma.it/en/node/168455.',
    source: 'manual',
  },
  {
    placeId: 'place_037',
    field: 'booking_required',
    value: true,
    reason: 'Rasputin: a speakeasy cocktail bar; reservation needed. Source: enprimeurclub.com/guide/best-cocktail-bars-in-florence.',
    source: 'manual',
  },
  {
    placeId: 'place_063',
    field: 'seasonal_notes',
    value: 'Ferries run less often in winter. Summer weekends extremely crowded.',
    reason: 'Bellagio: the town is open all year; only the ferry service shrinks in winter (raw note said "Open April-October only").',
    source: 'manual',
  },
]

/** Places dropped from the clean dataset entirely. */
export const removals: Removal[] = [
  {
    placeId: 'place_079',
    reason:
      'Prosciutto e Melone at Cremeria Mascareta: no such venue found. The description matches Enoteca Mascareta, a different (wine bar) place.',
    source: 'manual',
  },
]
