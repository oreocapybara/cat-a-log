export type SightingTier = {
  tier: 1 | 2 | 3 | 4 | 5 | 6
  name: string
  color: string
  textColor: string
  bgTint: string
  glow: boolean
  // Card-specific visual properties (cream-toned shareable cards)
  cardAccent: string
  cardChipBg: string
  cardRankNameColor: string
}

const TIERS: SightingTier[] = [
  {
    tier: 1,
    name: 'Stray',
    color: '#64748b',
    textColor: '#ffffff',
    bgTint: '#1e293b',
    glow: false,
    cardAccent: '#8b93a0',
    cardChipBg: '#e4e7eb',
    cardRankNameColor: '#6b6259',
  },
  {
    tier: 2,
    name: 'Lurker',
    color: '#78716c',
    textColor: '#ffffff',
    bgTint: '#292524',
    glow: false,
    cardAccent: '#8b8378',
    cardChipBg: '#e5e1db',
    cardRankNameColor: '#6b6259',
  },
  {
    tier: 3,
    name: 'Regular',
    color: '#eab308',
    textColor: '#1a1500',
    bgTint: '#1c1709',
    glow: false,
    cardAccent: '#cf9f1f',
    cardChipBg: '#fdf1d6',
    cardRankNameColor: '#cf9f1f',
  },
  {
    tier: 4,
    name: 'Local Celebrity',
    color: '#f97316',
    textColor: '#ffffff',
    bgTint: '#1a0a00',
    glow: false,
    cardAccent: '#f97316',
    cardChipBg: '#fde3d0',
    cardRankNameColor: '#f97316',
  },
  {
    tier: 5,
    name: 'Street Royalty',
    color: '#ef4444',
    textColor: '#ffffff',
    bgTint: '#1a0800',
    glow: false,
    cardAccent: '#ef4444',
    cardChipBg: '#fbdad9',
    cardRankNameColor: '#ef4444',
  },
  {
    tier: 6,
    name: 'Urban Legend',
    color: '#fbbf24',
    textColor: '#1a1500',
    bgTint: '#0f0a00',
    glow: true,
    cardAccent: '#fbbf24',
    cardChipBg: '#fdf1d6',
    cardRankNameColor: '#d97706',
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
