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

/** A single map marker with bounce-in animation */
const MapMarker: React.FC<{
  x: number
  y: number
  delay: number
  size?: number
}> = ({ x, y, delay, size = 24 }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 10, stiffness: 200 },
    durationInFrames: 15,
  })

  const scale = interpolate(progress, [0, 1], [0, 1])
  const opacity = interpolate(progress, [0, 1], [0, 1])

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `scale(${scale}) translate(-50%, -100%)`,
        opacity,
        transformOrigin: 'bottom center',
      }}
    >
      <svg width={size} height={size * 1.3} viewBox="0 0 24 32" fill={COLORS.primary}>
        <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" />
        <circle cx="12" cy="12" r="4" fill="white" />
      </svg>
    </div>
  )
}

/** Cluster badge (numbered circle) */
const ClusterBadge: React.FC<{
  x: number
  y: number
  count: number
  delay: number
}> = ({ x, y, count, delay }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 12, stiffness: 150 },
    durationInFrames: 15,
  })

  const scale = interpolate(progress, [0, 1], [0, 1])

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `scale(${scale}) translate(-50%, -50%)`,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: FONTS.body.fontFamily,
        fontSize: 18,
        fontWeight: 'bold',
        boxShadow: '0 2px 8px rgba(249, 115, 22, 0.4)',
      }}
    >
      {count}
    </div>
  )
}

// Marker positions for the map (relative to phone screen area)
const MARKERS_WAVE_1 = [{ x: 180, y: 320 }]

const MARKERS_WAVE_2 = [
  { x: 100, y: 200 },
  { x: 250, y: 180 },
  { x: 60, y: 400 },
  { x: 280, y: 350 },
]

const MARKERS_WAVE_3 = [
  { x: 150, y: 150 },
  { x: 300, y: 250 },
  { x: 80, y: 300 },
  { x: 200, y: 450 },
  { x: 120, y: 500 },
  { x: 260, y: 480 },
  { x: 50, y: 550 },
  { x: 310, y: 150 },
  { x: 170, y: 580 },
  { x: 240, y: 100 },
]

export const MapPopulates: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgWarm }}>
      <PhoneFrame>
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: COLORS.muted,
            position: 'relative',
          }}
        >
          {/* Simplified map grid background */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.15 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`h${i}`}
                style={{
                  position: 'absolute',
                  top: `${10 + i * 12}%`,
                  left: 0,
                  right: 0,
                  height: 1,
                  backgroundColor: COLORS.foreground,
                }}
              />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`v${i}`}
                style={{
                  position: 'absolute',
                  left: `${10 + i * 16}%`,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  backgroundColor: COLORS.foreground,
                }}
              />
            ))}
          </div>

          {/* Wave 1: Single marker (Crème Brûlée) */}
          <Sequence durationInFrames={750}>
            {MARKERS_WAVE_1.map((pos, i) => (
              <MapMarker key={`w1-${i}`} x={pos.x} y={pos.y} delay={30} />
            ))}
          </Sequence>

          {/* Wave 2: 4 more markers */}
          <Sequence from={180} durationInFrames={570}>
            {MARKERS_WAVE_2.map((pos, i) => (
              <MapMarker key={`w2-${i}`} x={pos.x} y={pos.y} delay={i * 40} />
            ))}
          </Sequence>

          {/* Wave 3: Many markers with fast stagger */}
          <Sequence from={360} durationInFrames={390}>
            {MARKERS_WAVE_3.map((pos, i) => (
              <MapMarker key={`w3-${i}`} x={pos.x} y={pos.y} delay={i * 30} />
            ))}
          </Sequence>

          {/* Cluster badges appearing (replaces dense markers) */}
          <Sequence from={600} durationInFrames={150}>
            <ClusterBadge x={130} y={280} count={5} delay={0} />
            <ClusterBadge x={270} y={180} count={8} delay={30} />
            <ClusterBadge x={200} y={500} count={7} delay={60} />
          </Sequence>
        </div>
      </PhoneFrame>

      {/* Floating text */}
      <Sequence from={200} durationInFrames={400}>
        <div
          style={{
            position: 'absolute',
            bottom: 240,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <AnimatedText
            text="You're not the only one watching out."
            delay={0}
            fontSize={32}
            color={COLORS.foreground}
            font="headline"
          />
        </div>
      </Sequence>
    </AbsoluteFill>
  )
}
