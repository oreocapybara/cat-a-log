import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS } from '../constants/colors'
import { FONTS } from '../constants/fonts'

/** Diagram node */
const Node: React.FC<{ label: string; delay: number; y: number }> = ({ label, delay, y }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 15, stiffness: 120 },
    durationInFrames: 18,
  })

  const opacity = interpolate(progress, [0, 1], [0, 1])
  const scale = interpolate(progress, [0, 1], [0.7, 1])

  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: '50%',
        transform: `translateX(-50%) scale(${scale})`,
        opacity,
        backgroundColor: 'white',
        border: `2px solid ${COLORS.primary}`,
        borderRadius: 16,
        padding: '14px 28px',
        fontFamily: FONTS.body.fontFamily,
        fontSize: 20,
        color: COLORS.foreground,
        whiteSpace: 'nowrap',
        textAlign: 'center',
      }}
    >
      {label}
    </div>
  )
}

/** Animated downward arrow */
const DownArrow: React.FC<{ delay: number; y: number }> = ({ delay, y }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 20, stiffness: 100 },
    durationInFrames: 15,
  })

  const opacity = interpolate(progress, [0, 1], [0, 1])
  const scaleY = interpolate(progress, [0, 1], [0, 1])

  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: '50%',
        transform: `translateX(-50%) scaleY(${scaleY})`,
        opacity,
        transformOrigin: 'top center',
      }}
    >
      <svg width="24" height="48" viewBox="0 0 24 48">
        <line x1="12" y1="0" x2="12" y2="38" stroke={COLORS.primary} strokeWidth="3" />
        <polygon points="6,38 12,48 18,38" fill={COLORS.primary} />
      </svg>
    </div>
  )
}

export const TechSimilarity: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgWarm,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 700,
          width: '100%',
          textAlign: 'center',
          fontFamily: FONTS.body.fontFamily,
          fontSize: 24,
          color: COLORS.foreground,
          opacity: 0.5,
        }}
      >
        Under the hood
      </div>

      {/* Flow: 3 nodes vertically stacked */}
      <Node label="CLIP embeddings" delay={30} y={800} />
      <DownArrow delay={60} y={860} />
      <Node label="Rank visual similarity" delay={90} y={920} />
      <DownArrow delay={120} y={980} />
      <Node label="User confirms on the spot" delay={150} y={1040} />
    </AbsoluteFill>
  )
}
