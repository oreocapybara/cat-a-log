export type SightingTier = {
  tier: 1 | 2 | 3 | 4 | 5 | 6
  name: string
  color: string
  textColor: string
  bgTint: string
  glow: boolean
}

const TIERS: SightingTier[] = [
  {
    tier: 1,
    name: 'Stray',
    color: '#64748b',
    textColor: '#ffffff',
    bgTint: '#1e293b',
    glow: false,
  },
  {
    tier: 2,
    name: 'Lurker',
    color: '#78716c',
    textColor: '#ffffff',
    bgTint: '#292524',
    glow: false,
  },
  {
    tier: 3,
    name: 'Regular',
    color: '#eab308',
    textColor: '#1a1500',
    bgTint: '#1c1709',
    glow: false,
  },
  {
    tier: 4,
    name: 'Local Celebrity',
    color: '#f97316',
    textColor: '#ffffff',
    bgTint: '#1a0a00',
    glow: false,
  },
  {
    tier: 5,
    name: 'Street Royalty',
    color: '#ef4444',
    textColor: '#ffffff',
    bgTint: '#1a0800',
    glow: false,
  },
  {
    tier: 6,
    name: 'Urban Legend',
    color: '#fbbf24',
    textColor: '#1a1500',
    bgTint: '#0f0a00',
    glow: true,
  },
]

const TIER_THRESHOLDS = [2, 5, 10, 20, 50]

export function getNextTierThreshold(timesSpotted: number): number | null {
  return TIER_THRESHOLDS.find((threshold) => timesSpotted < threshold) ?? null
}

export function getSightingTier(timesSpotted: number): SightingTier {
  if (timesSpotted >= 50) return TIERS[5]
  if (timesSpotted >= 20) return TIERS[4]
  if (timesSpotted >= 10) return TIERS[3]
  if (timesSpotted >= 5) return TIERS[2]
  if (timesSpotted >= 2) return TIERS[1]
  return TIERS[0]
}
