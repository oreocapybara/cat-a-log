import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  distanceKm,
  getStalenessTier,
  getStalenessOpacity,
  formatRelativeTime,
  formatLastSeen,
  offsetLatLng,
} from '@/lib/geo'

describe('distanceKm', () => {
  it('returns 0 for the same point', () => {
    expect(distanceKm(14.5, 121.0, 14.5, 121.0)).toBe(0)
  })

  it('computes roughly correct distance for known points', () => {
    // Manila to a point ~1km north
    const result = distanceKm(14.5, 121.0, 14.509, 121.0)
    expect(result).toBeCloseTo(1.0, 0)
  })

  it('accounts for longitude shrinkage at higher latitudes', () => {
    // At the equator, 1° lng ≈ 111km
    const equator = distanceKm(0, 0, 0, 1)
    // At 60° latitude, 1° lng ≈ 55.5km
    const lat60 = distanceKm(60, 0, 60, 1)
    expect(equator).toBeGreaterThan(lat60)
    expect(equator).toBeCloseTo(111, 0)
    expect(lat60).toBeCloseTo(55.5, 0)
  })

  it('handles negative coordinates', () => {
    const result = distanceKm(-33.8, 151.2, -33.8, 151.2)
    expect(result).toBe(0)
  })
})

describe('getStalenessTier', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "fresh" for sightings less than 1 day old', () => {
    const now = new Date('2026-07-01T12:00:00Z')
    vi.setSystemTime(now)
    const fiveHoursAgo = new Date('2026-07-01T07:00:00Z').toISOString()
    expect(getStalenessTier(fiveHoursAgo)).toBe('fresh')
  })

  it('returns "aging" for sightings 1–7 days old', () => {
    const now = new Date('2026-07-07T12:00:00Z')
    vi.setSystemTime(now)
    const threeDaysAgo = new Date('2026-07-04T12:00:00Z').toISOString()
    expect(getStalenessTier(threeDaysAgo)).toBe('aging')
  })

  it('returns "stale" for sightings older than 7 days', () => {
    const now = new Date('2026-07-15T12:00:00Z')
    vi.setSystemTime(now)
    const twoWeeksAgo = new Date('2026-07-01T12:00:00Z').toISOString()
    expect(getStalenessTier(twoWeeksAgo)).toBe('stale')
  })

  it('boundary: exactly 24h is "aging" (not fresh)', () => {
    const now = new Date('2026-07-02T12:00:00Z')
    vi.setSystemTime(now)
    const exactly24h = new Date('2026-07-01T12:00:00Z').toISOString()
    expect(getStalenessTier(exactly24h)).toBe('aging')
  })
})

describe('getStalenessOpacity', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 1 for fresh', () => {
    vi.setSystemTime(new Date('2026-07-01T12:00:00Z'))
    expect(getStalenessOpacity(new Date('2026-07-01T10:00:00Z').toISOString())).toBe(1)
  })

  it('returns 0.7 for aging', () => {
    vi.setSystemTime(new Date('2026-07-05T12:00:00Z'))
    expect(getStalenessOpacity(new Date('2026-07-02T12:00:00Z').toISOString())).toBe(0.7)
  })

  it('returns 0.4 for stale', () => {
    vi.setSystemTime(new Date('2026-07-20T12:00:00Z'))
    expect(getStalenessOpacity(new Date('2026-07-01T12:00:00Z').toISOString())).toBe(0.4)
  })
})

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-07T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for less than 1 hour ago', () => {
    const tenMinutesAgo = new Date('2026-07-07T11:50:00Z').toISOString()
    expect(formatRelativeTime(tenMinutesAgo)).toBe('just now')
  })

  it('returns hours ago for 1–24h', () => {
    const threeHoursAgo = new Date('2026-07-07T09:00:00Z').toISOString()
    expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago')
  })

  it('returns days ago for 1–7 days', () => {
    const twoDaysAgo = new Date('2026-07-05T12:00:00Z').toISOString()
    expect(formatRelativeTime(twoDaysAgo)).toBe('2 days ago')
  })

  it('uses singular "day" for exactly 1 day', () => {
    const oneDayAgo = new Date('2026-07-06T12:00:00Z').toISOString()
    expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago')
  })

  it('returns weeks ago for 1–4 weeks', () => {
    const twoWeeksAgo = new Date('2026-06-23T12:00:00Z').toISOString()
    expect(formatRelativeTime(twoWeeksAgo)).toBe('2 weeks ago')
  })

  it('uses singular "week" for exactly 1 week', () => {
    const oneWeekAgo = new Date('2026-06-30T12:00:00Z').toISOString()
    expect(formatRelativeTime(oneWeekAgo)).toBe('1 week ago')
  })

  it('returns "over a month ago" for more than 4 weeks', () => {
    const twoMonthsAgo = new Date('2026-05-01T12:00:00Z').toISOString()
    expect(formatRelativeTime(twoMonthsAgo)).toBe('over a month ago')
  })
})

describe('formatLastSeen', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-07T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('prepends "Seen" to the relative time', () => {
    const recent = new Date('2026-07-07T11:50:00Z').toISOString()
    expect(formatLastSeen(recent)).toBe('Seen just now')
  })
})

describe('offsetLatLng', () => {
  it('moves north when bearing is 0', () => {
    const [lat, lng] = offsetLatLng(14.5, 121.0, 0, 100)
    expect(lat).toBeGreaterThan(14.5) // moved north
    expect(lng).toBeCloseTo(121.0, 5) // lng unchanged
  })

  it('moves east when bearing is π/2', () => {
    const [lat, lng] = offsetLatLng(14.5, 121.0, Math.PI / 2, 100)
    expect(lat).toBeCloseTo(14.5, 5) // lat ~unchanged
    expect(lng).toBeGreaterThan(121.0) // moved east
  })

  it('moves south when bearing is π', () => {
    const [lat, lng] = offsetLatLng(14.5, 121.0, Math.PI, 100)
    expect(lat).toBeLessThan(14.5) // moved south
    expect(lng).toBeCloseTo(121.0, 4) // lng ~unchanged
  })

  it('offset is proportional to distance', () => {
    const [lat100] = offsetLatLng(14.5, 121.0, 0, 100)
    const [lat200] = offsetLatLng(14.5, 121.0, 0, 200)
    const delta100 = lat100 - 14.5
    const delta200 = lat200 - 14.5
    expect(delta200).toBeCloseTo(delta100 * 2, 8)
  })

  it('returns roughly the expected distance', () => {
    const [lat, lng] = offsetLatLng(14.5, 121.0, 0, 1000) // 1km north
    // Should be about 1/111 degrees north
    expect(lat - 14.5).toBeCloseTo(1 / 111, 3)
    expect(lng).toBeCloseTo(121.0, 5)
  })
})
