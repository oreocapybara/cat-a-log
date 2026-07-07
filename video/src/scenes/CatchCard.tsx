import React from 'react'
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { PhoneFrame } from '../components/PhoneFrame'
import { AnimatedText } from '../components/AnimatedText'
import { COLORS } from '../constants/colors'
import { FONTS } from '../constants/fonts'

/** Share button component */
const ShareButton: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 15, stiffness: 120 },
    durationInFrames: 18,
  })

  const opacity = interpolate(progress, [0, 1], [0, 1])
  const scale = interpolate(progress, [0, 1], [0.8, 1])

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        marginTop: 24,
        padding: '12px 32px',
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        color: 'white',
        fontFamily: FONTS.body.fontFamily,
        fontSize: 16,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
      Share
    </div>
  )
}

/** The catch card with holographic shimmer and 3D tilt */
const CatchCardInner: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Card enters with scale + fade
  const enterProgress = spring({
    fps,
    frame: frame - 30,
    config: { damping: 12, stiffness: 100 },
    durationInFrames: 25,
  })
  const cardScale = interpolate(enterProgress, [0, 1], [0.6, 1])
  const cardOpacity = interpolate(enterProgress, [0, 1], [0, 1])

  // Slow 3D tilt rotation (oscillates)
  const tiltPhase = (frame - 120) / 120
  const rotateY = frame > 120 ? Math.sin(tiltPhase * Math.PI) * 8 : 0
  const rotateX = frame > 120 ? Math.cos(tiltPhase * Math.PI * 0.7) * 4 : 0

  // Holographic shimmer position (moves across card)
  const shimmerX = interpolate(frame % 150, [0, 150], [-100, 400])

  return (
    <div
      style={{
        opacity: cardOpacity,
        transform: `scale(${cardScale}) perspective(800px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`,
        width: 280,
        height: 400,
        borderRadius: 20,
        backgroundColor: 'white',
        border: `3px solid ${COLORS.primary}`,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 20px 60px rgba(249, 115, 22, 0.2), 0 4px 16px rgba(0,0,0,0.1)',
        margin: '0 auto',
        marginTop: 80,
      }}
    >
      {/* Holographic shimmer overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(105deg, transparent ${shimmerX - 50}px, rgba(249, 115, 22, 0.15) ${shimmerX}px, rgba(254, 215, 170, 0.3) ${shimmerX + 30}px, transparent ${shimmerX + 80}px)`,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* Cat photo area */}
      <div
        style={{
          width: '100%',
          height: 200,
          backgroundColor: COLORS.secondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 64,
        }}
      >
        🐱
      </div>

      {/* Card info */}
      <div
        style={{
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.headline.fontFamily,
            fontSize: 22,
            color: COLORS.foreground,
          }}
        >
          Crème Brûlée
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              backgroundColor: COLORS.muted,
              fontSize: 12,
              fontFamily: FONTS.body.fontFamily,
              color: COLORS.foreground,
            }}
          >
            3 sightings
          </div>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              backgroundColor: COLORS.muted,
              fontSize: 12,
              fontFamily: FONTS.body.fontFamily,
              color: COLORS.foreground,
            }}
          >
            Jun 28, 2026
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              backgroundColor: COLORS.muted,
              fontSize: 12,
              fontFamily: FONTS.body.fontFamily,
              color: COLORS.foreground,
            }}
          >
            📍 Downtown
          </div>
        </div>
        {/* Tier badge */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            padding: '4px 12px',
            borderRadius: 10,
            backgroundColor: COLORS.primary,
            color: 'white',
            fontSize: 11,
            fontFamily: FONTS.body.fontFamily,
            fontWeight: 'bold',
            letterSpacing: 0.5,
          }}
        >
          ★ RARE
        </div>
      </div>
    </div>
  )
}

export const CatchCard: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgWarm }}>
      <PhoneFrame>
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: COLORS.bgWarm,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <CatchCardInner />

          {/* Share button */}
          <Sequence from={300} durationInFrames={450}>
            <ShareButton delay={0} />
          </Sequence>
        </div>
      </PhoneFrame>

      {/* Floating text */}
      <Sequence from={60} durationInFrames={300}>
        <div style={{ position: 'absolute', top: 360, left: 40 }}>
          <AnimatedText
            text="Every cat gets a card."
            delay={0}
            fontSize={28}
            color={COLORS.foreground}
            font="headline"
            align="left"
          />
        </div>
      </Sequence>
      <Sequence from={360} durationInFrames={390}>
        <div style={{ position: 'absolute', bottom: 300, right: 40 }}>
          <AnimatedText
            text="Collect. Share. Show you care."
            delay={0}
            fontSize={26}
            color={COLORS.foreground}
            font="body"
            align="right"
          />
        </div>
      </Sequence>
    </AbsoluteFill>
  )
}
