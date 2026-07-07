// Per-tier decoration motifs for shareable cards.
// Returns Satori-compatible JSX (display:flex required on every div).
// All decorations are absolutely-positioned inside the photo block.
//
// IMPORTANT: Satori (next/og ImageResponse) constraints:
// - Every div must have display:'flex'
// - No pseudo-elements, no CSS variables
// - Only absolute/relative positioning
// - Text nodes must be inside spans with explicit styles

import type { TierKey, CardTier } from './card-tiers'

// Scale factor: mockup is 480px wide, production is 1080px → multiply by 2.25
const S = 2.25

// ─── Frame styles per tier (applied to the inner card border) ───────────────

export type TierFrameStyle = {
  border: string
  boxShadow?: string
  // For urbanLegend gradient border trick
  background?: string
  borderColor?: string
}

export function tierFrameStyle(tier: CardTier): TierFrameStyle {
  switch (tier.key) {
    case 'stray':
      // Dashed border to look like a paper tag
      return { border: `${Math.round(7 * S)}px dashed ${tier.accent}` }

    case 'lurker':
      // Double-line effect: solid border + inset shadow ring (Satori can't parse border-style:double)
      return {
        border: `${Math.round(3 * S)}px solid ${tier.accent}`,
        boxShadow: `inset 0 0 0 ${Math.round(3 * S)}px #fffdf9, inset 0 0 0 ${Math.round(5 * S)}px ${tier.accent}`,
      }

    case 'urbanLegend':
      // Gold gradient border via transparent border + background-clip trick
      return {
        border: `${Math.round(7 * S)}px solid transparent`,
        background: `linear-gradient(${tier.key === 'urbanLegend' ? '#fffdf9' : '#fffdf9'},#fffdf9) padding-box, linear-gradient(135deg,#fbbf24,#fde68a,#d97706,#fbbf24) border-box`,
        borderColor: 'transparent',
      }

    case 'streetRoyalty':
      // Solid border plus inner ring via box-shadow
      return {
        border: `${Math.round(7 * S)}px solid ${tier.accent}`,
        boxShadow: `inset 0 0 0 ${Math.round(4 * S)}px #fffdf9, inset 0 0 0 ${Math.round(6 * S)}px ${tier.accent}54`,
      }

    default:
      // regular, localCelebrity — plain solid
      return { border: `${Math.round(7 * S)}px solid ${tier.accent}` }
  }
}

// ─── Chip style overrides per tier ──────────────────────────────────────────

export type TierChipOverride = {
  borderRadius?: number
  border?: string
  background?: string
  leadingGlyph?: string // prepended text glyph — DEPRECATED, use leadingSvgPath
  leadingSvgPath?: string // SVG path d="" for Satori-safe rendering
  glyphColor?: string
}

export function tierChipStyle(tier: CardTier): TierChipOverride {
  switch (tier.key) {
    case 'stray':
      // Squared tag shape
      return { borderRadius: Math.round(10 * S) }

    case 'streetRoyalty':
      return {
        border: `${Math.round(2 * S)}px solid ${tier.accent}54`,
        leadingSvgPath: 'M2 20h20v2H2v-2zm1-7l4 4 5-7 5 7 4-4-1 9H4L3 13zm9-11l2.5 5h-5L12 2z',
        glyphColor: tier.accent,
      }

    case 'localCelebrity':
      return {
        leadingSvgPath:
          'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
        glyphColor: tier.accent,
      }

    case 'urbanLegend':
      return {
        background: 'linear-gradient(135deg,#fdf1d6,#fde68a)',
        leadingSvgPath: 'M12 0l3 9h9l-7.5 5.5L19.5 24 12 18l-7.5 6 3-9.5L0 9h9z',
        glyphColor: '#d97706',
      }

    default:
      return {}
  }
}

// ─── Photo outline style per tier ───────────────────────────────────────────

export type PhotoOutlineStyle = {
  border: string
  boxShadow?: string
  opacity?: number
}

export function tierPhotoOutline(tier: CardTier): PhotoOutlineStyle {
  switch (tier.key) {
    case 'stray':
      return {
        border: `${Math.round(3 * S)}px solid ${tier.accent}`,
      }

    case 'urbanLegend':
      // Gold outline + glow
      return {
        border: `${Math.round(3 * S)}px solid #d97706`,
        boxShadow: `0 0 ${Math.round(22 * S)}px #fbbf2477`,
      }

    default:
      return {
        border: `${Math.round(3 * S)}px solid ${tier.accent}`,
      }
  }
}

// ─── Photo decorations (overlays, badges, sparkles) ─────────────────────────
// Returns an array of absolutely-positioned JSX elements to render
// inside the photo block container.

export function tierPhotoDecorations(tier: CardTier): React.ReactElement[] {
  const decorations: React.ReactElement[] = []

  switch (tier.key) {
    case 'lurker':
      // Half-seen vignette overlay inside the photo frame
      decorations.push(
        <div
          key="lurker-vignette"
          style={{
            position: 'absolute',
            inset: Math.round(9 * S),
            borderRadius: Math.round(16 * S),
            display: 'flex',
            background: 'linear-gradient(to top, #3a352fcc 0%, transparent 38%)',
            pointerEvents: 'none',
          }}
        />
      )
      break

    case 'regular':
      // Star sticker badge on photo top-right (SVG star — Satori can't render ★ glyph from Fredoka)
      decorations.push(
        <div
          key="regular-sticker"
          style={{
            position: 'absolute',
            top: Math.round(-12 * S),
            right: Math.round(-4 * S),
            width: Math.round(52 * S),
            height: Math.round(52 * S),
            borderRadius: 9999,
            backgroundColor: tier.accent,
            border: `${Math.round(4 * S)}px solid #fff`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 ${Math.round(6 * S)}px ${Math.round(14 * S)}px rgba(0,0,0,.18)`,
          }}
        >
          <svg
            width={Math.round(24 * S)}
            height={Math.round(24 * S)}
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
      )
      break

    case 'localCelebrity':
      // Two starbursts — top-left and bottom-right (SVG — Satori can't render ★ glyph)
      decorations.push(
        <div
          key="celeb-star-tl"
          style={{
            position: 'absolute',
            top: Math.round(-12 * S),
            left: Math.round(-6 * S),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width={Math.round(36 * S)}
            height={Math.round(36 * S)}
            viewBox="0 0 24 24"
            fill={tier.accent}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>,
        <div
          key="celeb-star-br"
          style={{
            position: 'absolute',
            bottom: Math.round(-6 * S),
            right: Math.round(-6 * S),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width={Math.round(26 * S)}
            height={Math.round(26 * S)}
            viewBox="0 0 24 24"
            fill={tier.accent}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
      )
      break

    case 'streetRoyalty':
      // Crown centered above the photo (SVG — Satori can't render ♛ glyph)
      decorations.push(
        <div
          key="royalty-crown"
          style={{
            position: 'absolute',
            top: Math.round(-30 * S),
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width={Math.round(46 * S)}
            height={Math.round(46 * S)}
            viewBox="0 0 24 24"
            fill={tier.accent}
          >
            <path d="M2 20h20v2H2v-2zm1-7l4 4 5-7 5 7 4-4-1 9H4L3 13zm9-11l2.5 5h-5L12 2z" />
          </svg>
        </div>
      )
      break

    case 'urbanLegend':
      // Three sparkles around photo (SVG — Satori can't render ✦ glyph)
      decorations.push(
        <div
          key="legend-sparkle-1"
          style={{
            position: 'absolute',
            top: Math.round(-14 * S),
            left: Math.round(-8 * S),
            display: 'flex',
          }}
        >
          <svg
            width={Math.round(30 * S)}
            height={Math.round(30 * S)}
            viewBox="0 0 24 24"
            fill="#d97706"
          >
            <path d="M12 0l3 9h9l-7.5 5.5L19.5 24 12 18l-7.5 6 3-9.5L0 9h9z" />
          </svg>
        </div>,
        <div
          key="legend-sparkle-2"
          style={{
            position: 'absolute',
            top: Math.round(26 * S),
            right: Math.round(-8 * S),
            display: 'flex',
          }}
        >
          <svg
            width={Math.round(22 * S)}
            height={Math.round(22 * S)}
            viewBox="0 0 24 24"
            fill="#fbbf24"
          >
            <path d="M12 0l3 9h9l-7.5 5.5L19.5 24 12 18l-7.5 6 3-9.5L0 9h9z" />
          </svg>
        </div>,
        <div
          key="legend-sparkle-3"
          style={{
            position: 'absolute',
            bottom: Math.round(-8 * S),
            left: Math.round(30 * S),
            display: 'flex',
          }}
        >
          <svg
            width={Math.round(22 * S)}
            height={Math.round(22 * S)}
            viewBox="0 0 24 24"
            fill="#fbbf24"
          >
            <path d="M12 0l3 9h9l-7.5 5.5L19.5 24 12 18l-7.5 6 3-9.5L0 9h9z" />
          </svg>
        </div>
      )
      break
  }

  return decorations
}

// ─── Outer frame extra shadow (urbanLegend gets a glow) ─────────────────────

export function outerFrameShadow(tier: CardTier): string {
  const base = `0 ${Math.round(8 * S)}px ${Math.round(32 * S)}px rgba(0,0,0,.10)`
  if (tier.key === 'urbanLegend') {
    return `${base}, 0 0 ${Math.round(46 * S)}px #fbbf2455`
  }
  return base
}

// ─── Rarity dot glow (urbanLegend filled dots glow) ─────────────────────────

export function rarityDotShadow(tier: CardTier, filled: boolean): string | undefined {
  if (tier.key === 'urbanLegend' && filled) {
    return `0 0 ${Math.round(6 * S)}px #fbbf24aa`
  }
  return undefined
}

// ─── Photo block extra top margin for crown clearance ───────────────────────

export function photoBlockExtraTopMargin(tierKey: TierKey): number {
  if (tierKey === 'streetRoyalty') return Math.round(30 * S)
  return 0
}
