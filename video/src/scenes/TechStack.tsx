import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS } from '../constants/colors'
import { FONTS } from '../constants/fonts'

const STACK_ITEMS = [
  'Next.js 16',
  'Supabase',
  'CLIP Embeddings',
  'Leaflet',
  'Vercel',
  'PWA',
  'TypeScript',
]

/** Single stack badge */
const StackBadge: React.FC<{ label: string; delay: number }> = ({ label, delay }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 12, stiffness: 150 },
    durationInFrames: 15,
  })

  const opacity = interpolate(progress, [0, 1], [0, 1])
  const scale = interpolate(progress, [0, 1], [0.6, 1])
  const translateY = interpolate(progress, [0, 1], [20, 0])

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        padding: '12px 24px',
        borderRadius: 12,
        backgroundColor: 'white',
        border: `2px solid ${COLORS.primary}`,
        fontFamily: FONTS.body.fontFamily,
        fontSize: 22,
        color: COLORS.foreground,
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(249, 115, 22, 0.1)',
      }}
    >
      {label}
    </div>
  )
}

export const TechStack: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgWarm,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      {/* Title */}
      <div
        style={{
          fontFamily: FONTS.body.fontFamily,
          fontSize: 24,
          color: COLORS.foreground,
          opacity: 0.5,
          marginBottom: 20,
        }}
      >
        Built with
      </div>

      {/* Stack badges in a wrap layout */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 14,
          maxWidth: 600,
          padding: '0 40px',
        }}
      >
        {STACK_ITEMS.map((item, i) => (
          <StackBadge key={item} label={item} delay={30 + i * 20} />
        ))}
      </div>
    </AbsoluteFill>
  )
}
