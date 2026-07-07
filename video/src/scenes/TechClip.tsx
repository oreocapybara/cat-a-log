import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS } from '../constants/colors'
import { FONTS } from '../constants/fonts'

/** A single node in the flow diagram */
const FlowNode: React.FC<{
  label: string
  delay: number
  x: number
  y: number
}> = ({ label, delay, x, y }) => {
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
        left: x,
        top: y,
        transform: `scale(${scale})`,
        opacity,
        backgroundColor: 'white',
        border: `2px solid ${COLORS.primary}`,
        borderRadius: 16,
        padding: '16px 24px',
        fontFamily: FONTS.body.fontFamily,
        fontSize: 22,
        color: COLORS.foreground,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
  )
}

/** Animated arrow between nodes */
const FlowArrow: React.FC<{ delay: number; x: number; y: number }> = ({ delay, x, y }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 20, stiffness: 100 },
    durationInFrames: 15,
  })

  const opacity = interpolate(progress, [0, 1], [0, 1])
  const scaleX = interpolate(progress, [0, 1], [0, 1])

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity,
        transform: `scaleX(${scaleX})`,
        transformOrigin: 'left center',
      }}
    >
      <svg width="60" height="24" viewBox="0 0 60 24">
        <line x1="0" y1="12" x2="48" y2="12" stroke={COLORS.primary} strokeWidth="3" />
        <polygon points="48,6 60,12 48,18" fill={COLORS.primary} />
      </svg>
    </div>
  )
}

export const TechClip: React.FC = () => {
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
          top: 600,
          width: '100%',
          textAlign: 'center',
          fontFamily: FONTS.body.fontFamily,
          fontSize: 28,
          color: COLORS.foreground,
          opacity: 0.6,
        }}
      >
        How it works
      </div>

      {/* Flow diagram: 3 nodes in a vertical column */}
      <FlowNode label="📷  Photo" delay={30} x={380} y={780} />
      <FlowArrow delay={60} x={500} y={840} />
      <FlowNode label="🧠  CLIP Embedding" delay={90} x={320} y={900} />
      <FlowArrow delay={120} x={500} y={960} />
      <FlowNode label="💾  Stored for matching" delay={150} x={310} y={1020} />
    </AbsoluteFill>
  )
}
