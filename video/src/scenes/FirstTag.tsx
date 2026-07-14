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
import { FloatingLabel } from '../components/FloatingLabel'
import { COLORS } from '../constants/colors'
import { FONTS } from '../constants/fonts'

/** Camera icon SVG for floating label */
const CameraIcon: React.FC = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
)

/** MapPin icon SVG for floating label */
const MapPinIcon: React.FC = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

/** Pencil icon SVG for floating label */
const PencilIcon: React.FC = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
)

/** Sub-step 1: Camera viewfinder + photo snap */
const CameraScreen: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const photoScale = spring({
    fps,
    frame: frame - 180,
    config: { damping: 12, stiffness: 200 },
    durationInFrames: 15,
  })

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#1A1A1A',
        position: 'relative',
      }}
    >
      {/* Viewfinder grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr 1fr',
        }}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} style={{ border: '1px solid rgba(255,255,255,0.2)' }} />
        ))}
      </div>
      {/* Photo appearing */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: COLORS.secondary,
          transform: `scale(${photoScale})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 64 }}>🐱</span>
        <span
          style={{
            fontFamily: FONTS.body.fontFamily,
            fontSize: 16,
            color: COLORS.foreground,
            position: 'absolute',
            bottom: 20,
          }}
        >
          Photo captured
        </span>
      </div>
    </div>
  )
}

/** Sub-step 2: Location picker with bouncing pin */
const LocationScreen: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const pinBounce = spring({
    fps,
    frame: frame - 60,
    config: { damping: 8, stiffness: 200 },
    durationInFrames: 20,
  })
  const pinY = interpolate(pinBounce, [0, 1], [-80, 0])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.muted,
        position: 'relative',
      }}
    >
      {/* Simplified map background */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.3 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={`h${i}`}
            style={{
              position: 'absolute',
              top: `${20 + i * 20}%`,
              left: 0,
              right: 0,
              height: 2,
              backgroundColor: COLORS.foreground,
              opacity: 0.2,
            }}
          />
        ))}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`v${i}`}
            style={{
              position: 'absolute',
              left: `${25 + i * 20}%`,
              top: 0,
              bottom: 0,
              width: 2,
              backgroundColor: COLORS.foreground,
              opacity: 0.2,
            }}
          />
        ))}
      </div>
      {/* Pin */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: `translate(-50%, ${pinY}px)`,
        }}
      >
        <svg width="40" height="52" viewBox="0 0 24 24" fill={COLORS.primary} stroke="none">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" fill="white" />
        </svg>
      </div>
    </div>
  )
}

/** Sub-step 3: Name typing */
const NameScreen: React.FC = () => {
  const frame = useCurrentFrame()

  const name = 'Crème Brûlée'
  const charsVisible = Math.min(Math.floor(frame / 8), name.length)
  const displayName = name.slice(0, charsVisible)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.bgWarm,
        padding: 40,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        paddingTop: 80,
      }}
    >
      <span
        style={{
          fontFamily: FONTS.body.fontFamily,
          fontSize: 18,
          color: COLORS.foreground,
          opacity: 0.6,
        }}
      >
        Give them a name
      </span>
      <div
        style={{
          borderBottom: `2px solid ${COLORS.primary}`,
          paddingBottom: 8,
          minHeight: 48,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.headline.fontFamily,
            fontSize: 36,
            color: COLORS.foreground,
          }}
        >
          {displayName}
        </span>
        {charsVisible < name.length && (
          <span
            style={{
              borderRight: `2px solid ${COLORS.primary}`,
              marginLeft: 2,
            }}
          />
        )}
      </div>
    </div>
  )
}

/** Sub-step 4: Details (ear-tipped toggle, notes) */
const DetailsScreen: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const toggleProgress = spring({
    fps,
    frame: frame - 90,
    config: { damping: 15, stiffness: 100 },
    durationInFrames: 15,
  })
  const toggleX = interpolate(toggleProgress, [0, 1], [0, 20])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.bgWarm,
        padding: 40,
        display: 'flex',
        flexDirection: 'column',
        gap: 30,
        paddingTop: 80,
      }}
    >
      <span
        style={{
          fontFamily: FONTS.body.fontFamily,
          fontSize: 18,
          color: COLORS.foreground,
          opacity: 0.6,
        }}
      >
        Details
      </span>
      {/* Ear-tipped toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span
          style={{
            fontFamily: FONTS.body.fontFamily,
            fontSize: 20,
            color: COLORS.foreground,
          }}
        >
          Ear-tipped?
        </span>
        <div
          style={{
            width: 48,
            height: 28,
            borderRadius: 14,
            backgroundColor: toggleProgress > 0.5 ? COLORS.primary : '#D1D5DB',
            padding: 4,
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: 'white',
              transform: `translateX(${toggleX}px)`,
            }}
          />
        </div>
      </div>
      {/* Notes field */}
      <div
        style={{
          border: `1px solid ${COLORS.muted}`,
          borderRadius: 12,
          padding: 16,
          minHeight: 80,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.body.fontFamily,
            fontSize: 16,
            color: COLORS.foreground,
            opacity: 0.4,
          }}
        >
          Notes (optional)
        </span>
      </div>
    </div>
  )
}

/** Sub-step 5: Confirmation card */
const ConfirmationScreen: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const cardSpring = spring({
    fps,
    frame: frame - 30,
    config: { damping: 12, stiffness: 150 },
    durationInFrames: 20,
  })
  const cardY = interpolate(cardSpring, [0, 1], [200, 0])
  const cardOpacity = interpolate(cardSpring, [0, 1], [0, 1])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.bgWarm,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
      }}
    >
      {/* Success checkmark */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#22C55E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="32"
          height="32"
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
      <span
        style={{
          fontFamily: FONTS.headline.fontFamily,
          fontSize: 24,
          color: COLORS.foreground,
        }}
      >
        Tagged!
      </span>
      {/* Cat card sliding up */}
      <div
        style={{
          opacity: cardOpacity,
          transform: `translateY(${cardY}px)`,
          backgroundColor: 'white',
          borderRadius: 16,
          padding: 20,
          width: '80%',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            backgroundColor: COLORS.secondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 28 }}>🐱</span>
        </div>
        <div>
          <span
            style={{
              fontFamily: FONTS.headline.fontFamily,
              fontSize: 20,
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
            Just now · Ear-tipped
          </span>
        </div>
      </div>
    </div>
  )
}

/** Main FirstTag composition */
export const FirstTag: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgWarm }}>
      {/* Phone frame with sub-step sequences */}
      <PhoneFrame>
        <Sequence durationInFrames={360}>
          <CameraScreen />
        </Sequence>
        <Sequence from={360} durationInFrames={300}>
          <LocationScreen />
        </Sequence>
        <Sequence from={660} durationInFrames={300}>
          <NameScreen />
        </Sequence>
        <Sequence from={960} durationInFrames={300}>
          <DetailsScreen />
        </Sequence>
        <Sequence from={1260} durationInFrames={390}>
          <ConfirmationScreen />
        </Sequence>
      </PhoneFrame>

      {/* Floating labels appear alongside each sub-step */}
      <Sequence from={60} durationInFrames={300}>
        <FloatingLabel
          icon={<CameraIcon />}
          text="Snap a photo"
          position="left"
          delay={30}
          top={380}
        />
      </Sequence>
      <Sequence from={390} durationInFrames={270}>
        <FloatingLabel
          icon={<MapPinIcon />}
          text="Tag the location"
          position="right"
          delay={30}
          top={420}
        />
      </Sequence>
      <Sequence from={690} durationInFrames={270}>
        <FloatingLabel
          icon={<PencilIcon />}
          text="Give them a name"
          position="left"
          delay={30}
          top={460}
        />
      </Sequence>
    </AbsoluteFill>
  )
}
