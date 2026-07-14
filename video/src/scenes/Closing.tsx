import React from 'react'
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { AnimatedText } from '../components/AnimatedText'
import { COLORS } from '../constants/colors'
import { FONTS } from '../constants/fonts'

/** Small logo for closing */
const LogoSmall: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 15, stiffness: 100 },
    durationInFrames: 20,
  })

  const opacity = interpolate(progress, [0, 1], [0, 1])

  return (
    <div
      style={{
        position: 'absolute',
        top: 1050,
        width: '100%',
        textAlign: 'center',
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill={COLORS.primary}>
        <circle cx="11" cy="4" r="2" />
        <circle cx="4.5" cy="8.5" r="2" />
        <circle cx="17.5" cy="8.5" r="2" />
        <circle cx="7" cy="13" r="2" />
        <circle cx="17" cy="13" r="2" />
        <path d="M12 20c-2-2-6-4-6-7a4 4 0 0 1 6-3 4 4 0 0 1 6 3c0 3-4 5-6 7z" />
      </svg>
      <span
        style={{
          fontFamily: FONTS.headline.fontFamily,
          fontSize: 28,
          color: COLORS.foregroundDark,
        }}
      >
        Cat-A-Log
      </span>
    </div>
  )
}

/** Connection animation: two markers linked by a line, checkmark blooms */
const ConnectionAnimation: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // First marker appears
  const marker1 = spring({
    fps,
    frame: frame - 30,
    config: { damping: 12, stiffness: 150 },
    durationInFrames: 18,
  })

  // Second marker appears
  const marker2 = spring({
    fps,
    frame: frame - 60,
    config: { damping: 12, stiffness: 150 },
    durationInFrames: 18,
  })

  // Line draws between them
  const lineProgress = spring({
    fps,
    frame: frame - 90,
    config: { damping: 20, stiffness: 80 },
    durationInFrames: 30,
  })

  // Checkmark blooms
  const checkProgress = spring({
    fps,
    frame: frame - 150,
    config: { damping: 10, stiffness: 180 },
    durationInFrames: 18,
  })
  const checkScale = interpolate(checkProgress, [0, 1], [0, 1])

  const lineWidth = interpolate(lineProgress, [0, 1], [0, 200])

  return (
    <div
      style={{
        position: 'relative',
        width: 400,
        height: 100,
        margin: '0 auto',
      }}
    >
      {/* Marker 1 */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          top: 30,
          opacity: interpolate(marker1, [0, 1], [0, 1]),
          transform: `scale(${interpolate(marker1, [0, 1], [0, 1])})`,
        }}
      >
        <svg width="24" height="32" viewBox="0 0 24 32" fill={COLORS.primary}>
          <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" />
          <circle cx="12" cy="12" r="4" fill="white" />
        </svg>
      </div>

      {/* Connecting line */}
      <div
        style={{
          position: 'absolute',
          left: 104,
          top: 45,
          width: lineWidth,
          height: 3,
          backgroundColor: COLORS.primary,
          borderRadius: 2,
          opacity: 0.6,
        }}
      />

      {/* Marker 2 */}
      <div
        style={{
          position: 'absolute',
          left: 300,
          top: 30,
          opacity: interpolate(marker2, [0, 1], [0, 1]),
          transform: `scale(${interpolate(marker2, [0, 1], [0, 1])})`,
        }}
      >
        <svg width="24" height="32" viewBox="0 0 24 32" fill={COLORS.primary}>
          <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" />
          <circle cx="12" cy="12" r="4" fill="white" />
        </svg>
      </div>

      {/* Checkmark at midpoint */}
      <div
        style={{
          position: 'absolute',
          left: 185,
          top: 20,
          transform: `scale(${checkScale})`,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: '#22C55E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    </div>
  )
}

export const Closing: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgDark,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
      }}
    >
      {/* Connection animation */}
      <Sequence durationInFrames={250}>
        <div style={{ position: 'absolute', top: 700, width: '100%' }}>
          <ConnectionAnimation />
        </div>
      </Sequence>

      {/* Main tagline */}
      <Sequence from={180} durationInFrames={270}>
        <div
          style={{
            position: 'absolute',
            top: 900,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <AnimatedText
            text="Every cat, known. Every neighbor, connected."
            delay={0}
            fontSize={36}
            color={COLORS.foregroundDark}
            font="headline"
          />
        </div>
      </Sequence>

      {/* Logo (smaller) */}
      <Sequence from={270} durationInFrames={180}>
        <LogoSmall delay={0} />
      </Sequence>

      {/* Credits / built with */}
      <Sequence from={330} durationInFrames={120}>
        <div
          style={{
            position: 'absolute',
            bottom: 300,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <AnimatedText
            text="Next.js 16 · Supabase · CLIP · Leaflet · Vercel · PWA · TypeScript"
            delay={0}
            fontSize={18}
            color={COLORS.foregroundDark}
            font="body"
          />
        </div>
      </Sequence>
    </AbsoluteFill>
  )
}
