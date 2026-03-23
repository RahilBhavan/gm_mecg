import { describe, expect, it } from 'vitest'

import { matchZones, ZONE_KEYWORDS } from '@/lib/zoneMatch'

describe('matchZones', () => {
  it('matches seating keywords to Z04', () => {
    expect(matchZones('automotive seat systems and foam')).toContain('Z04')
  })

  it('matches steel to Z02', () => {
    expect(matchZones('galvanized steel sheet for body stampings')).toContain('Z02')
  })

  it('returns empty for unmatched text', () => {
    expect(matchZones('')).toEqual([])
    expect(matchZones('unknown product line')).toEqual([])
  })

  it('is case insensitive', () => {
    expect(matchZones('HVAC modules')).toContain('Z05')
  })
})

describe('ZONE_KEYWORDS', () => {
  it('has all 14 zones', () => {
    expect(Object.keys(ZONE_KEYWORDS).length).toBe(14)
  })
})
