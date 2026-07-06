import { Cross, TriangleAlert } from 'lucide-react'
import type { CatTag } from './supabase/types'

export type WelfareTier = {
  tag: CatTag['tag']
  color: string
  glyph: string
  desaturate: boolean
}

// Shared with app/(app)/map/components/cat-map.tsx (marker borders/badges) and
// cat-preview-card.tsx (photo frame) so the same color always means the same
// status everywhere on the map screen.
const WELFARE_TIERS: WelfareTier[] = [
  { tag: 'needs_medical', color: '#dc2626', glyph: '+', desaturate: false },
  { tag: 'possible_rabies', color: '#b45309', glyph: '!', desaturate: false },
  { tag: 'deceased', color: '#9ca3af', glyph: '', desaturate: true },
]

export const DEFAULT_WELFARE_COLOR = '#f97316'

// Priority when a cat carries multiple tags: the most actionable one wins,
// since only one frame/badge treatment fits at a glance.
export function getWelfareTier(tags: CatTag['tag'][]): WelfareTier | null {
  return WELFARE_TIERS.find((tier) => tags.includes(tier.tag)) ?? null
}

// Per-tag badge styling (as opposed to getWelfareTier's single-winner priority
// pick) — used anywhere every active tag renders as its own labeled pill:
// cat-preview-card.tsx and filter-sheet.tsx. Keeping one definition means a tag's
// color/label/icon can't drift between "what you see on a cat" and "what you filter by".
export const TAG_META: Record<
  CatTag['tag'],
  { label: string; icon: typeof Cross | typeof TriangleAlert | null; className: string }
> = {
  needs_medical: {
    label: 'Needs medical',
    icon: Cross,
    className: 'bg-destructive/10 text-destructive',
  },
  possible_rabies: {
    label: 'Possible rabies',
    icon: TriangleAlert,
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400',
  },
  deceased: {
    label: 'Passed away',
    icon: null,
    className: 'bg-secondary text-secondary-foreground',
  },
}
