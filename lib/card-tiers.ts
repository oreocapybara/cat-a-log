// Tier visual data for shareable cards (Catch Card + Profile Card).
// Single source of truth for the cream-toned mascot-card system.

export type TierKey =
  | 'stray'
  | 'lurker'
  | 'regular'
  | 'localCelebrity'
  | 'streetRoyalty'
  | 'urbanLegend'

export interface CardTier {
  key: TierKey
  label: string
  accent: string // border / dots / progress / avatar ring
  chipBg: string // tier-name chip background
  dotsFilled: 1 | 2 | 3 | 4 | 5 | 6
  rankNameColor: string // color used for tier name in stat tiles
  next: TierKey | null // null = max tier
}

export const CARD_TIERS: Record<TierKey, CardTier> = {
  stray: {
    key: 'stray',
    label: 'Stray',
    accent: '#8b93a0',
    chipBg: '#e4e7eb',
    dotsFilled: 1,
    rankNameColor: '#6b6259', // accent too low-contrast on cream
    next: 'lurker',
  },
  lurker: {
    key: 'lurker',
    label: 'Lurker',
    accent: '#8b8378',
    chipBg: '#e5e1db',
    dotsFilled: 2,
    rankNameColor: '#6b6259', // accent too low-contrast on cream
    next: 'regular',
  },
  regular: {
    key: 'regular',
    label: 'Regular',
    accent: '#cf9f1f',
    chipBg: '#fdf1d6',
    dotsFilled: 3,
    rankNameColor: '#cf9f1f',
    next: 'localCelebrity',
  },
  localCelebrity: {
    key: 'localCelebrity',
    label: 'Local Celebrity',
    accent: '#f97316',
    chipBg: '#fde3d0',
    dotsFilled: 4,
    rankNameColor: '#f97316',
    next: 'streetRoyalty',
  },
  streetRoyalty: {
    key: 'streetRoyalty',
    label: 'Street Royalty',
    accent: '#ef4444',
    chipBg: '#fbdad9',
    dotsFilled: 5,
    rankNameColor: '#ef4444',
    next: 'urbanLegend',
  },
  urbanLegend: {
    key: 'urbanLegend',
    label: 'Urban Legend',
    accent: '#fbbf24',
    chipBg: '#fdf1d6',
    dotsFilled: 6,
    rankNameColor: '#d97706', // darker gold for legibility
    next: null,
  },
}

// Medical alert constants — tier-independent status flag
export const MEDICAL_ALERT = {
  chipBg: '#fdf1ef',
  chipText: '#c8402f',
  chipBorder: '#ef5b4e',
} as const

// Base neutrals for the card frame
export const CARD_NEUTRALS = {
  outerBg: '#fdf4e7', // cream outer frame
  innerBg: '#fffdf9', // white inner card
  nameColor: '#2a2117', // warm brown for cat/user names
  secondaryText: '#6b6259', // neutral secondary text
  mutedText: '#a17a4a', // warm muted captions
  chipStatBg: '#fbf1e2', // stat pill background
  dashedBorder: '#d6c9b8', // footer dashed separator
} as const

// Map from the existing sighting tier number (1–6) to the card tier key
export function tierKeyFromNumber(tier: 1 | 2 | 3 | 4 | 5 | 6): TierKey {
  const map: Record<number, TierKey> = {
    1: 'stray',
    2: 'lurker',
    3: 'regular',
    4: 'localCelebrity',
    5: 'streetRoyalty',
    6: 'urbanLegend',
  }
  return map[tier]
}

// Ordinal suffix helper (1st, 2nd, 3rd, 4th, …)
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}
