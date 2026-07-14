import React from 'react'
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { ComingSoonPill } from '../components/ComingSoonPill'
import { AnimatedText } from '../components/AnimatedText'
import { COLORS } from '../constants/colors'
import { FONTS } from '../constants/fonts'

/** Side-by-side photo comparison */
const PhotoPair: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 15, stiffness: 120 },
    durationInFrames: 20,
  })

  const opacity = interpolate(progress, [0, 1], [0, 1])
  const scale = interpolate(progress, [0, 1], [0.9, 1])

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        display: 'flex',
        gap: 20,
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 16,
          backgroundColor: COLORS.secondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 56,
          border: '3px solid rgba(255,255,255,0.2)',
        }}
      >
        🐱
      </div>
      <div
        style={{
          fontFamily: FONTS.headline.fontFamily,
          fontSize: 36,
          color: COLORS.foregroundDark,
          opacity: 0.5,
        }}
      >
        =?
      </div>
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 16,
          backgroundColor: COLORS.secondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 56,
          border: '3px solid rgba(255,255,255,0.2)',
        }}
      >
        🐱
      </div>
    </div>
  )
}

/** Vote progress bar */
const VoteProgress: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 20, stiffness: 80 },
    durationInFrames: 90,
  })

  const width = interpolate(progress, [0, 1], [0, 100])
  const votes = Math.round(interpolate(progress, [0, 1], [0, 3]))

  return (
    <div style={{ width: 400, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span
          style={{
            fontFamily: FONTS.body.fontFamily,
            fontSize: 16,
            color: COLORS.foregroundDark,
          }}
        >
          Confirms: {votes}/3
        </span>
        {votes >= 3 && (
          <span
            style={{
              fontFamily: FONTS.body.fontFamily,
              fontSize: 16,
              color: '#22C55E',
            }}
          >
            ✓ Merged
          </span>
        )}
      </div>
      <div
        style={{
          width: '100%',
          height: 8,
          borderRadius: 4,
          backgroundColor: 'rgba(255,255,255,0.15)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${width}%`,
            height: '100%',
            borderRadius: 4,
            backgroundColor: votes >= 3 ? '#22C55E' : COLORS.primary,
          }}
        />
      </div>
    </div>
  )
}

/** Merge animation: two cards merging into one */
const MergeAnimation: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const mergeProgress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 12, stiffness: 100 },
    durationInFrames: 30,
  })

  const leftX = interpolate(mergeProgress, [0, 1], [-80, 0])
  const rightX = interpolate(mergeProgress, [0, 1], [80, 0])
  const glow = interpolate(mergeProgress, [0, 0.8, 1], [0, 0, 1])

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          transform: `translateX(${leftX}px)`,
          width: 80,
          height: 100,
          borderRadius: 12,
          backgroundColor: COLORS.secondary,
          border: `2px solid ${COLORS.primary}`,
          boxShadow: glow > 0 ? `0 0 ${glow * 30}px ${COLORS.primary}` : 'none',
        }}
      />
      <div
        style={{
          transform: `translateX(${rightX}px)`,
          width: 80,
          height: 100,
          borderRadius: 12,
          backgroundColor: COLORS.secondary,
          border: `2px solid ${COLORS.primary}`,
          boxShadow: glow > 0 ? `0 0 ${glow * 30}px ${COLORS.primary}` : 'none',
        }}
      />
    </div>
  )
}

export const VotingVision: React.FC = () => {
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
      {/* Coming Soon pill */}
      <ComingSoonPill />

      {/* Photo pair */}
      <Sequence durationInFrames={750}>
        <div
          style={{
            position: 'absolute',
            top: 700,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 40,
          }}
        >
          <PhotoPair delay={30} />
        </div>
      </Sequence>

      {/* Vote progress */}
      <Sequence from={150} durationInFrames={600}>
        <div
          style={{
            position: 'absolute',
            top: 1100,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <VoteProgress delay={60} />
        </div>
      </Sequence>

      {/* Merge animation */}
      <Sequence from={480} durationInFrames={270}>
        <div
          style={{
            position: 'absolute',
            top: 1250,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <MergeAnimation delay={30} />
        </div>
      </Sequence>

      {/* Floating text */}
      <Sequence from={30} durationInFrames={300}>
        <div
          style={{
            position: 'absolute',
            top: 1500,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <AnimatedText
            text="Next: the community verifies."
            delay={0}
            fontSize={28}
            color={COLORS.foregroundDark}
            font="headline"
          />
        </div>
      </Sequence>
      <Sequence from={360} durationInFrames={390}>
        <div
          style={{
            position: 'absolute',
            top: 1580,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <AnimatedText
            text="Multiple neighbors confirm — records merge."
            delay={0}
            fontSize={24}
            color={COLORS.foregroundDark}
            font="body"
          />
        </div>
      </Sequence>
    </AbsoluteFill>
  )
}
