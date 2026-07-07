import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS } from '../constants/colors'
import { FONTS } from '../constants/fonts'

type FloatingLabelProps = {
  icon: React.ReactNode
  text: string
  position?: 'left' | 'right'
  delay?: number
  top?: number
}

export const FloatingLabel: React.FC<FloatingLabelProps> = ({
  icon,
  text,
  position = 'left',
  delay = 0,
  top = 400,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 18, stiffness: 100 },
    durationInFrames: 20,
  })

  const opacity = interpolate(progress, [0, 1], [0, 1])
  const translateX = interpolate(progress, [0, 1], [position === 'left' ? -40 : 40, 0])

  return (
    <div
      style={{
        position: 'absolute',
        top,
        [position]: 40,
        opacity,
        transform: `translateX(${translateX}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexDirection: position === 'right' ? 'row-reverse' : 'row',
      }}
    >
      <div style={{ color: COLORS.primary, width: 32, height: 32 }}>{icon}</div>
      <span
        style={{
          fontFamily: FONTS.body.fontFamily,
          fontSize: 24,
          color: COLORS.foreground,
        }}
      >
        {text}
      </span>
    </div>
  )
}
