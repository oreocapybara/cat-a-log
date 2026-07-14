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

/** Match candidate card with glow highlight */
const MatchCandidate: React.FC<{
  name: string
  similarity: number
  highlight?: boolean
  delay: number
}> = ({ name, similarity, highlight = false, delay }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 15, stiffness: 120 },
    durationInFrames: 18,
  })

  const opacity = interpolate(progress, [0, 1], [0, 1])
  const translateX = interpolate(progress, [0, 1], [40, 0])

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${translateX}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: highlight ? 'rgba(249, 115, 22, 0.08)' : 'white',
        border: highlight ? `2px solid ${COLORS.primary}` : '1px solid #E5E7EB',
        boxShadow: highlight ? '0 0 20px rgba(249, 115, 22, 0.2)' : 'none',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          backgroundColor: COLORS.secondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
        }}
      >
        🐱
      </div>
      <div style={{ flex: 1 }}>
        <span
          style={{
            fontFamily: FONTS.headline.fontFamily,
            fontSize: 16,
            color: COLORS.foreground,
            display: 'block',
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontFamily: FONTS.body.fontFamily,
            fontSize: 13,
            color: COLORS.foreground,
            opacity: 0.6,
          }}
        >
          {similarity}% match
        </span>
      </div>
      {highlight && (
        <div
          style={{
            backgroundColor: COLORS.primary,
            color: 'white',
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: 12,
            fontFamily: FONTS.body.fontFamily,
            fontWeight: 'bold',
          }}
        >
          Best
        </div>
      )}
    </div>
  )
}

/** "That's them!" confirmation button */
const ConfirmButton: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 12, stiffness: 150 },
    durationInFrames: 15,
  })

  const scale = interpolate(progress, [0, 1], [0.8, 1])
  const opacity = interpolate(progress, [0, 1], [0, 1])

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        backgroundColor: COLORS.primary,
        color: 'white',
        borderRadius: 12,
        padding: '14px 28px',
        fontFamily: FONTS.headline.fontFamily,
        fontSize: 18,
        textAlign: 'center',
        marginTop: 16,
      }}
    >
      That&apos;s them! ✓
    </div>
  )
}

/** Sighting counter */
const SightingCounter: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 12, stiffness: 150 },
    durationInFrames: 15,
  })

  const count = Math.round(interpolate(progress, [0, 1], [2, 3]))

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderRadius: 8,
        backgroundColor: COLORS.muted,
      }}
    >
      <span
        style={{
          fontFamily: FONTS.body.fontFamily,
          fontSize: 14,
          color: COLORS.foreground,
        }}
      >
        Sightings:
      </span>
      <span
        style={{
          fontFamily: FONTS.headline.fontFamily,
          fontSize: 20,
          color: COLORS.primary,
        }}
      >
        {count}
      </span>
    </div>
  )
}

export const AIMatch: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgWarm }}>
      <PhoneFrame>
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: COLORS.bgWarm,
            padding: 24,
            paddingTop: 60,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Header */}
          <Sequence durationInFrames={900}>
            <div>
              <span
                style={{
                  fontFamily: FONTS.headline.fontFamily,
                  fontSize: 20,
                  color: COLORS.foreground,
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                Similar cats nearby
              </span>
              <span
                style={{
                  fontFamily: FONTS.body.fontFamily,
                  fontSize: 14,
                  color: COLORS.foreground,
                  opacity: 0.6,
                }}
              >
                We found potential matches
              </span>
            </div>
          </Sequence>

          {/* Candidates list */}
          <Sequence from={120} durationInFrames={780}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginTop: 16,
              }}
            >
              <MatchCandidate name="Crème Brûlée" similarity={94} highlight delay={0} />
              <MatchCandidate name="Unknown tabby" similarity={67} delay={60} />
              <MatchCandidate name="Patches" similarity={41} delay={120} />
            </div>
          </Sequence>

          {/* Confirm button appears */}
          <Sequence from={450} durationInFrames={450}>
            <ConfirmButton delay={0} />
          </Sequence>

          {/* Sighting count ticks up */}
          <Sequence from={600} durationInFrames={300}>
            <SightingCounter delay={60} />
          </Sequence>
        </div>
      </PhoneFrame>

      {/* Floating labels */}
      <Sequence from={150} durationInFrames={400}>
        <div style={{ position: 'absolute', top: 400, left: 40 }}>
          <AnimatedText
            text="AI recognizes the cat."
            delay={0}
            fontSize={26}
            color={COLORS.foreground}
            font="body"
            align="left"
          />
        </div>
      </Sequence>
      <Sequence from={500} durationInFrames={400}>
        <div style={{ position: 'absolute', top: 1400, left: 40 }}>
          <AnimatedText
            text="One tap to confirm."
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
