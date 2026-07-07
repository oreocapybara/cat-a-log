import { describe, it, expect } from 'vitest'
import { tierKeyFromNumber, ordinal, CARD_TIERS } from '@/lib/card-tiers'

describe('tierKeyFromNumber', () => {
  it('maps 1 to stray', () => {
    expect(tierKeyFromNumber(1)).toBe('stray')
  })

  it('maps 2 to lurker', () => {
    expect(tierKeyFromNumber(2)).toBe('lurker')
  })

  it('maps 3 to regular', () => {
    expect(tierKeyFromNumber(3)).toBe('regular')
  })

  it('maps 4 to localCelebrity', () => {
    expect(tierKeyFromNumber(4)).toBe('localCelebrity')
  })

  it('maps 5 to streetRoyalty', () => {
    expect(tierKeyFromNumber(5)).toBe('streetRoyalty')
  })

  it('maps 6 to urbanLegend', () => {
    expect(tierKeyFromNumber(6)).toBe('urbanLegend')
  })

  it('all mapped tier keys exist in CARD_TIERS', () => {
    for (let i = 1; i <= 6; i++) {
      const key = tierKeyFromNumber(i as 1 | 2 | 3 | 4 | 5 | 6)
      expect(CARD_TIERS[key]).toBeDefined()
    }
  })
})

describe('ordinal', () => {
  it('handles 1st', () => {
    expect(ordinal(1)).toBe('1st')
  })

  it('handles 2nd', () => {
    expect(ordinal(2)).toBe('2nd')
  })

  it('handles 3rd', () => {
    expect(ordinal(3)).toBe('3rd')
  })

  it('handles 4th through 9th with "th"', () => {
    expect(ordinal(4)).toBe('4th')
    expect(ordinal(5)).toBe('5th')
    expect(ordinal(9)).toBe('9th')
  })

  it('handles teens (11th, 12th, 13th)', () => {
    expect(ordinal(11)).toBe('11th')
    expect(ordinal(12)).toBe('12th')
    expect(ordinal(13)).toBe('13th')
  })

  it('handles 21st, 22nd, 23rd', () => {
    expect(ordinal(21)).toBe('21st')
    expect(ordinal(22)).toBe('22nd')
    expect(ordinal(23)).toBe('23rd')
  })

  it('handles 100th', () => {
    expect(ordinal(100)).toBe('100th')
  })

  it('handles 101st, 102nd, 103rd', () => {
    expect(ordinal(101)).toBe('101st')
    expect(ordinal(102)).toBe('102nd')
    expect(ordinal(103)).toBe('103rd')
  })

  it('handles 111th, 112th, 113th (teens rule)', () => {
    expect(ordinal(111)).toBe('111th')
    expect(ordinal(112)).toBe('112th')
    expect(ordinal(113)).toBe('113th')
  })
})
