import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONTS } from '../constants/fonts'

export const ComingSoonPill: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const progress = spring({
    fps,
    frame,
    config: { damping: 15, stiffness: 100 },
    durationInFrames: 20,
  })

  const opacity = interpolate(progress, [0, 1], [0, 1])
  const scale = interpolate(progress, [0, 1], [0.8, 1])

  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        right: 60,
        opacity,
        transform: `scale(${scale})`,
        padding: '10px 20px',
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        fontFamily: FONTS.body.fontFamily,
        fontSize: 18,
        color: '#EEF1F6',
        letterSpacing: 0.5,
      }}
    >
      Coming soon
    </div>
  )
}
