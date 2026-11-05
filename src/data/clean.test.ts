import { describe, expect, it } from 'vitest'
import { cleanPlaces } from './clean.ts'
import type { Correction } from './corrections.ts'
import type { Place } from './place.ts'

// A minimal valid Place; each test overrides only what it cares about.
const place = (overrides: Partial<Place> = {}): Place => {
  return {
    id: 'place_001',
    name: 'Test Place',
    type: 'museum',
    city: 'Rome',
    region: 'Lazio',
    neighborhood: 'Centro',
    description: 'A place.',
    latitude: 41.9,
    longitude: 12.5,
    hours: '9:00-18:00',
    duration_minutes: 60,
    price_range: '€',
    rating: 4.5,
    tags: ['historic'],
    seasonal_notes: null,
    booking_required: false,
    ...overrides,
  }
}

describe('cleanPlaces', () => {
  it('returns every place unchanged when there is nothing to fix', () => {
    const raw = [place({ id: 'place_001' }), place({ id: 'place_002' })]

    const { places, review } = cleanPlaces(raw, [])

    expect(places).toEqual(raw)
    expect(review).toEqual([])
  })

  it('never mutates the raw input', () => {
    const raw = [place({ tags: ['local_favorite'] })]
    const snapshot = structuredClone(raw)

    cleanPlaces(raw, [
      { placeId: 'place_001', field: 'longitude', value: 9.19, reason: 'r', source: 'manual' },
    ])

    expect(raw).toEqual(snapshot)
  })

  describe('tag normalization rule', () => {
    it('rewrites underscores to hyphens and records a review row', () => {
      const raw = [place({ tags: ['food', 'local_favorite'] })]

      const { places, review } = cleanPlaces(raw, [])

      expect(places[0].tags).toEqual(['food', 'local-favorite'])
      expect(review).toEqual([
        {
          placeId: 'place_001',
          placeName: 'Test Place',
          field: 'tags',
          from: ['food', 'local_favorite'],
          to: ['food', 'local-favorite'],
          reason: 'Normalized tag spelling to lowercase-hyphenated form.',
          source: 'rule',
          status: 'applied',
        },
      ])
    })

    it('removes duplicates created by normalization', () => {
      const raw = [place({ tags: ['local-favorite', 'local_favorite'] })]

      const { places } = cleanPlaces(raw, [])

      expect(places[0].tags).toEqual(['local-favorite'])
    })
  })

  describe('corrections', () => {
    it('applies a manual correction and records the before/after', () => {
      const raw = [place({ longitude: 11.191 })]
      const corrections: Correction[] = [
        {
          placeId: 'place_001',
          field: 'longitude',
          value: 9.1873,
          reason: 'Longitude was ~150 km east of Milan.',
          source: 'manual',
        },
      ]

      const { places, review } = cleanPlaces(raw, corrections)

      expect(places[0].longitude).toBe(9.1873)
      expect(review).toEqual([
        {
          placeId: 'place_001',
          placeName: 'Test Place',
          field: 'longitude',
          from: 11.191,
          to: 9.1873,
          reason: 'Longitude was ~150 km east of Milan.',
          source: 'manual',
          status: 'applied',
        },
      ])
    })

    it('applies assumption corrections like manual ones', () => {
      const raw = [place({ hours: null })]

      const { places } = cleanPlaces(raw, [
        { placeId: 'place_001', field: 'hours', value: 'Daily 0:00-24:00', reason: 'Open square.', source: 'assumption' },
      ])

      expect(places[0].hours).toBe('Daily 0:00-24:00')
    })

    it('holds back an unapproved AI draft but still lists it for review', () => {
      const raw = [place({ booking_required: null })]

      const { places, review } = cleanPlaces(raw, [
        { placeId: 'place_001', field: 'booking_required', value: false, reason: 'Casual bar.', source: 'ai-draft' },
      ])

      expect(places[0].booking_required).toBeNull()
      expect(review).toHaveLength(1)
      expect(review[0]).toMatchObject({ source: 'ai-draft', status: 'pending', from: null, to: false })
    })

    it('applies an AI draft once it is approved', () => {
      const raw = [place({ booking_required: null })]

      const { places, review } = cleanPlaces(raw, [
        {
          placeId: 'place_001',
          field: 'booking_required',
          value: false,
          reason: 'Casual bar.',
          source: 'ai-draft',
          approved: true,
        },
      ])

      expect(places[0].booking_required).toBe(false)
      expect(review[0].status).toBe('applied')
    })

    it('throws when a correction targets a place id that does not exist', () => {
      expect(() =>
        cleanPlaces([place()], [
          { placeId: 'place_999', field: 'rating', value: 4, reason: 'r', source: 'manual' },
        ]),
      ).toThrow(/place_999/)
    })

    it('throws when two corrections target the same field of the same place', () => {
      expect(() =>
        cleanPlaces([place()], [
          { placeId: 'place_001', field: 'rating', value: 4, reason: 'a', source: 'manual' },
          { placeId: 'place_001', field: 'rating', value: 3, reason: 'b', source: 'manual' },
        ]),
      ).toThrow(/place_001.*rating/)
    })

    it('throws when a correction would not change anything (stale correction)', () => {
      expect(() =>
        cleanPlaces([place({ rating: 4.5 })], [
          { placeId: 'place_001', field: 'rating', value: 4.5, reason: 'r', source: 'manual' },
        ]),
      ).toThrow(/place_001.*rating/)
    })
  })

  describe('removals', () => {
    it('drops the removed place, keeps the rest in order, and records a review row', () => {
      const raw = [
        place({ id: 'place_001' }),
        place({ id: 'place_002', name: 'Ghost Bar' }),
        place({ id: 'place_003' }),
      ]

      const { places, review } = cleanPlaces(raw, [], [
        { placeId: 'place_002', reason: 'Could not find it anywhere.', source: 'manual' },
      ])

      expect(places.map((p) => p.id)).toEqual(['place_001', 'place_003'])
      expect(review).toEqual([
        {
          placeId: 'place_002',
          placeName: 'Ghost Bar',
          field: '(place)',
          from: 'included',
          to: 'removed',
          reason: 'Could not find it anywhere.',
          source: 'manual',
          status: 'applied',
        },
      ])
    })

    it('does not list tag-rule rows for a removed place', () => {
      const raw = [place({ tags: ['local_favorite'] })]

      const { review } = cleanPlaces(raw, [], [{ placeId: 'place_001', reason: 'r', source: 'manual' }])

      expect(review.map((r) => r.field)).toEqual(['(place)'])
    })

    it('holds back an unapproved AI-draft removal', () => {
      const { places, review } = cleanPlaces([place()], [], [
        { placeId: 'place_001', reason: 'r', source: 'ai-draft' },
      ])

      expect(places).toHaveLength(1)
      expect(review[0]).toMatchObject({ field: '(place)', status: 'pending' })
    })

    it('throws when a removal targets a place id that does not exist', () => {
      expect(() =>
        cleanPlaces([place()], [], [{ placeId: 'place_999', reason: 'r', source: 'manual' }]),
      ).toThrow(/place_999/)
    })

    it('throws when the same place is removed twice', () => {
      expect(() =>
        cleanPlaces([place()], [], [
          { placeId: 'place_001', reason: 'a', source: 'manual' },
          { placeId: 'place_001', reason: 'b', source: 'manual' },
        ]),
      ).toThrow(/place_001/)
    })

    it('throws when a place is both removed and corrected (the correction would be dead)', () => {
      expect(() =>
        cleanPlaces(
          [place()],
          [{ placeId: 'place_001', field: 'rating', value: 4, reason: 'r', source: 'manual' }],
          [{ placeId: 'place_001', reason: 'r', source: 'manual' }],
        ),
      ).toThrow(/place_001/)
    })
  })

  it('sorts review rows by place id, then field', () => {
    const raw = [place({ id: 'place_002', tags: ['local_favorite'] }), place({ id: 'place_001' })]

    const { review } = cleanPlaces(raw, [
      { placeId: 'place_002', field: 'hours', value: 'Daily 9:00-17:00', reason: 'r', source: 'manual' },
      { placeId: 'place_001', field: 'rating', value: 4, reason: 'r', source: 'manual' },
    ])

    expect(review.map((r) => `${r.placeId}.${r.field}`)).toEqual([
      'place_001.rating',
      'place_002.hours',
      'place_002.tags',
    ])
  })
})
