import { describe, it, expect } from 'vitest'
import { getSightingTier, getNextTierThreshold } from '@/lib/sighting-tiers'

describe('getSightingTier', () => {
  it('returns tier 1 (Stray) for 0 sightings', () => {
    const tier = getSightingTier(0)
    expect(tier.tier).toBe(1)
    expect(tier.name).toBe('Stray')
  })

  it('returns tier 1 (Stray) for 1 sighting', () => {
    const tier = getSightingTier(1)
    expect(tier.tier).toBe(1)
    expect(tier.name).toBe('Stray')
  })

  it('returns tier 2 (Lurker) at exactly 2 sightings', () => {
    const tier = getSightingTier(2)
    expect(tier.tier).toBe(2)
    expect(tier.name).toBe('Lurker')
  })

  it('returns tier 3 (Regular) at exactly 5 sightings', () => {
    const tier = getSightingTier(5)
    expect(tier.tier).toBe(3)
    expect(tier.name).toBe('Regular')
  })

  it('returns tier 4 (Local Celebrity) at exactly 10 sightings', () => {
    const tier = getSightingTier(10)
    expect(tier.tier).toBe(4)
    expect(tier.name).toBe('Local Celebrity')
  })

  it('returns tier 5 (Street Royalty) at exactly 20 sightings', () => {
    const tier = getSightingTier(20)
    expect(tier.tier).toBe(5)
    expect(tier.name).toBe('Street Royalty')
  })

  it('returns tier 6 (Urban Legend) at exactly 50 sightings', () => {
    const tier = getSightingTier(50)
    expect(tier.tier).toBe(6)
    expect(tier.name).toBe('Urban Legend')
  })

  it('returns tier 6 for very high sighting counts', () => {
    const tier = getSightingTier(999)
    expect(tier.tier).toBe(6)
    expect(tier.name).toBe('Urban Legend')
    expect(tier.glow).toBe(true)
  })

  it('stays at tier 2 at 4 sightings (just below tier 3 threshold)', () => {
    const tier = getSightingTier(4)
    expect(tier.tier).toBe(2)
  })

  it('stays at tier 3 at 9 sightings (just below tier 4 threshold)', () => {
    const tier = getSightingTier(9)
    expect(tier.tier).toBe(3)
  })
})

describe('getNextTierThreshold', () => {
  it('returns 2 for 0 sightings (next threshold to reach Lurker)', () => {
    expect(getNextTierThreshold(0)).toBe(2)
  })

  it('returns 2 for 1 sighting', () => {
    expect(getNextTierThreshold(1)).toBe(2)
  })

  it('returns 5 for 2 sightings (already at Lurker, next is Regular)', () => {
    expect(getNextTierThreshold(2)).toBe(5)
  })

  it('returns 5 for 4 sightings', () => {
    expect(getNextTierThreshold(4)).toBe(5)
  })

  it('returns 10 for 5 sightings', () => {
    expect(getNextTierThreshold(5)).toBe(10)
  })

  it('returns 20 for 10 sightings', () => {
    expect(getNextTierThreshold(10)).toBe(20)
  })

  it('returns 50 for 20 sightings', () => {
    expect(getNextTierThreshold(20)).toBe(50)
  })

  it('returns null for 50+ sightings (already at max tier)', () => {
    expect(getNextTierThreshold(50)).toBeNull()
    expect(getNextTierThreshold(100)).toBeNull()
  })
})
