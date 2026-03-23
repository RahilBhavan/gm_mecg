import { describe, expect, it } from 'vitest'

import { formatPct1, formatRevenueUsd, toTitleCase } from '@/lib/format'

describe('toTitleCase', () => {
  it('normalises ALL CAPS words', () => {
    expect(toTitleCase('MAGNA INTERNATIONAL INC')).toContain('Magna')
  })
})

describe('formatRevenueUsd', () => {
  it('formats billions', () => {
    expect(formatRevenueUsd(6.24e10)).toBe('$62.4B')
  })

  it('handles null', () => {
    expect(formatRevenueUsd(null)).toBe('—')
  })
})

describe('formatPct1', () => {
  it('converts decimal to percent', () => {
    expect(formatPct1(0.0744)).toBe('7.4%')
  })
})
