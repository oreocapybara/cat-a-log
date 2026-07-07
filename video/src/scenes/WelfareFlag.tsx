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

/** Cat profile header inside phone */
const CatProfile: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const progress = spring({
    fps,
    frame,
    config: { damping: 15, stiffness: 120 },
    durationInFrames: 18,
  })
  const opacity = interpolate(progress, [0, 1], [0, 1])

  return (
    <div style={{ opacity, padding: 24, paddingTop: 50 }}>
      {/* Cat photo + name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: COLORS.secondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
          }}
        >
          🐱
        </div>
        <div>
          <span
            style={{
              fontFamily: FONTS.headline.fontFamily,
              fontSize: 22,
              color: COLORS.foreground,
              display: 'block',
            }}
          >
            Crème Brûlée
          </span>
          <span
            style={{
              fontFamily: FONTS.body.fontFamily,
              fontSize: 14,
              color: COLORS.foreground,
              opacity: 0.6,
            }}
          >
            3 sightings · Ear-tipped
          </span>
        </div>
      </div>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            backgroundColor: COLORS.muted,
          }}
        >
          <span
            style={{
              fontFamily: FONTS.body.fontFamily,
              fontSize: 13,
              color: COLORS.foreground,
            }}
          >
            📍 Downtown Park
          </span>
        </div>
        <div
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            backgroundColor: COLORS.muted,
          }}
        >
          <span
            style={{
              fontFamily: FONTS.body.fontFamily,
              fontSize: 13,
              color: COLORS.foreground,
            }}
          >
            🗓 First seen: Jun 28
          </span>
        </div>
      </div>
    </div>
  )
}

/** Welfare flag appearing with urgency */
const WelfareFlagBadge: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 10, stiffness: 180 },
    durationInFrames: 18,
  })

  const scale = interpolate(progress, [0, 1], [0, 1])
  const opacity = interpolate(progress, [0, 1], [0, 1])

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 20px',
        borderRadius: 12,
        backgroundColor: '#FEF2F2',
        border: '2px solid #EF4444',
        margin: '0 24px',
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#EF4444"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
      <span
        style={{
          fontFamily: FONTS.body.fontFamily,
          fontSize: 15,
          color: '#DC2626',
          fontWeight: 600,
        }}
      >
        Needs medical attention
      </span>
    </div>
  )
}

/** Map view with pulsing marker */
const MapWithPulse: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Continuous pulse animation (2-second cycle = 60 frames)
  const pulsePhase = (frame % 60) / 60
  const pulseScale = interpolate(pulsePhase, [0, 0.5, 1], [1, 1.8, 1])
  const pulseOpacity = interpolate(pulsePhase, [0, 0.5, 1], [0.6, 0, 0.6])

  const enterProgress = spring({
    fps,
    frame,
    config: { damping: 15, stiffness: 100 },
    durationInFrames: 20,
  })
  const opacity = interpolate(enterProgress, [0, 1], [0, 1])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.muted,
        position: 'relative',
        opacity,
      }}
    >
      {/* Map grid background */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.15 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`h${i}`}
            style={{
              position: 'absolute',
              top: `${15 + i * 15}%`,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: COLORS.foreground,
            }}
          />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={`v${i}`}
            style={{
              position: 'absolute',
              left: `${15 + i * 18}%`,
              top: 0,
              bottom: 0,
              width: 1,
              backgroundColor: COLORS.foreground,
            }}
          />
        ))}
      </div>

      {/* Regular markers */}
      {[
        { x: 80, y: 200 },
        { x: 250, y: 150 },
        { x: 300, y: 350 },
      ].map((pos, i) => (
        <div key={i} style={{ position: 'absolute', left: pos.x, top: pos.y }}>
          <svg width="20" height="26" viewBox="0 0 24 32" fill={COLORS.primary}>
            <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" />
            <circle cx="12" cy="12" r="4" fill="white" />
          </svg>
        </div>
      ))}

      {/* Pulsing red marker (flagged cat) */}
      <div style={{ position: 'absolute', left: 160, top: 300 }}>
        {/* Pulse ring */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${pulseScale})`,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'transparent',
            border: '3px solid #EF4444',
            opacity: pulseOpacity,
          }}
        />
        {/* Red marker */}
        <svg width="24" height="32" viewBox="0 0 24 32" fill="#EF4444">
          <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" />
          <circle cx="12" cy="12" r="4" fill="white" />
        </svg>
      </div>
    </div>
  )
}

export const WelfareFlag: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgWarm }}>
      <PhoneFrame>
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: COLORS.bgWarm,
            position: 'relative',
          }}
        >
          {/* Cat profile (first half) */}
          <Sequence durationInFrames={450}>
            <CatProfile />
            <Sequence from={180}>
              <WelfareFlagBadge delay={0} />
            </Sequence>
          </Sequence>

          {/* Map view (second half) */}
          <Sequence from={450} durationInFrames={300}>
            <MapWithPulse />
          </Sequence>
        </div>
      </PhoneFrame>

      {/* Floating text */}
      <Sequence from={200} durationInFrames={250}>
        <div style={{ position: 'absolute', top: 380, right: 40 }}>
          <AnimatedText
            text="A neighbor flags concern."
            delay={0}
            fontSize={26}
            color={COLORS.foreground}
            font="body"
            align="right"
          />
        </div>
      </Sequence>
      <Sequence from={500} durationInFrames={250}>
        <div style={{ position: 'absolute', bottom: 280, left: 40 }}>
          <AnimatedText
            text="Now everyone nearby knows."
            delay={0}
            fontSize={26}
            color={COLORS.foreground}
            font="body"
            align="left"
          />
        </div>
      </Sequence>
    </AbsoluteFill>
  )
}
