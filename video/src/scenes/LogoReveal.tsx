import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS } from '../constants/colors'
import { FONTS } from '../constants/fonts'

export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Logo bounce-in: scale 0 → 1.15 → 1
  const logoSpring = spring({
    fps,
    frame,
    config: { damping: 10, stiffness: 150, mass: 0.8 },
    durationInFrames: 20,
  })
  const logoScale = interpolate(logoSpring, [0, 1], [0, 1])

  // Tagline fades in after logo settles
  const taglineProgress = spring({
    fps,
    frame: frame - 30,
    config: { damping: 20, stiffness: 100 },
    durationInFrames: 20,
  })
  const taglineOpacity = interpolate(taglineProgress, [0, 1], [0, 1])
  const taglineY = interpolate(taglineProgress, [0, 1], [20, 0])

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgWarm,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}
    >
      {/* Logo — paw icon + wordmark */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Paw icon (simplified SVG) */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 24 24"
          fill="none"
          stroke={COLORS.primary}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="4" r="2" fill={COLORS.primary} />
          <circle cx="4.5" cy="8.5" r="2" fill={COLORS.primary} />
          <circle cx="17.5" cy="8.5" r="2" fill={COLORS.primary} />
          <circle cx="7" cy="13" r="2" fill={COLORS.primary} />
          <circle cx="17" cy="13" r="2" fill={COLORS.primary} />
          <path
            d="M12 20c-2-2-6-4-6-7a4 4 0 0 1 6-3 4 4 0 0 1 6 3c0 3-4 5-6 7z"
            fill={COLORS.primary}
          />
        </svg>

        {/* Wordmark */}
        <span
          style={{
            fontFamily: FONTS.headline.fontFamily,
            fontSize: 72,
            color: COLORS.foreground,
            letterSpacing: -1,
          }}
        >
          Cat-A-Log
        </span>
      </div>

      {/* Tagline */}
      <span
        style={{
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          fontFamily: FONTS.body.fontFamily,
          fontSize: 32,
          color: COLORS.foreground,
        }}
      >
        Every cat, known.
      </span>
    </AbsoluteFill>
  )
}
