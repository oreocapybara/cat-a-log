import React from 'react'
import { AbsoluteFill } from 'remotion'
import { AnimatedText } from '../components/AnimatedText'
import { COLORS } from '../constants/colors'

const LINES = [
  { text: 'You see the same stray cat every day.', delay: 30 },
  { text: 'So does your neighbor.', delay: 120 },
  { text: 'But neither of you knows.', delay: 240 },
  { text: 'What if you could change that?', delay: 400 },
]

export const Hook: React.FC = () => {
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
      {LINES.map((line) => (
        <AnimatedText
          key={line.text}
          text={line.text}
          delay={line.delay}
          fontSize={44}
          color={COLORS.foregroundDark}
          font="headline"
        />
      ))}
    </AbsoluteFill>
  )
}
