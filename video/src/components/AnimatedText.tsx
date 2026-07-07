import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS } from '../constants/colors'
import { FONTS } from '../constants/fonts'

type AnimatedTextProps = {
  text: string
  delay?: number
  fontSize?: number
  color?: string
  font?: 'headline' | 'body'
  align?: 'center' | 'left' | 'right'
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  delay = 0,
  fontSize = 48,
  color = COLORS.foreground,
  font = 'headline',
  align = 'center',
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 20, stiffness: 120 },
    durationInFrames: 20,
  })

  const opacity = interpolate(progress, [0, 1], [0, 1])
  const translateY = interpolate(progress, [0, 1], [30, 0])

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        fontSize,
        color,
        fontFamily: FONTS[font].fontFamily,
        textAlign: align,
        lineHeight: 1.3,
        padding: '0 60px',
      }}
    >
      {text}
    </div>
  )
}
