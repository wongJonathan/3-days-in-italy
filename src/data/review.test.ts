import { describe, expect, it } from 'vitest'
import type { ReviewRow } from './clean.ts'
import { renderReview } from './review.ts'

const applied: ReviewRow = {
  placeId: 'place_059',
  placeName: 'Brera Antique Market',
  field: 'longitude',
  from: 11.191,
  to: 9.1873,
  reason: 'Longitude was ~150 km east of Milan.',
  source: 'manual',
  status: 'applied',
}

const pending: ReviewRow = {
  placeId: 'place_020',
  placeName: 'Il Sorpasso',
  field: 'booking_required',
  from: null,
  to: false,
  reason: 'Casual all-day bar.',
  source: 'ai-draft',
  status: 'pending',
}

describe('renderReview', () => {
  it('renders one table row per review row with before/after values', () => {
    const md = renderReview([applied])

    expect(md).toContain(
      '| place_059 | Brera Antique Market | longitude | `11.191` | `9.1873` | Longitude was ~150 km east of Milan. | manual | ✅ applied |',
    )
  })

  it('marks unapproved AI drafts as pending', () => {
    const md = renderReview([pending])

    expect(md).toContain('| place_020 | Il Sorpasso | booking_required | `null` | `false` | Casual all-day bar. | ai-draft | ⏳ pending |')
  })

  it('summarizes counts so pending work is visible at a glance', () => {
    const md = renderReview([applied, pending])

    expect(md).toContain('2 changes: 1 applied, 1 pending approval.')
  })

  it('escapes pipe characters so the table never breaks', () => {
    const md = renderReview([{ ...applied, reason: 'a | b' }])

    expect(md).toContain('a \\| b')
  })

  it('says so when there is nothing to review', () => {
    expect(renderReview([])).toContain('No changes.')
  })

  it('states that the file is generated and where approvals are made', () => {
    const md = renderReview([])

    expect(md).toMatch(/generated/i)
    expect(md).toContain('src/data/corrections.ts')
  })
})
