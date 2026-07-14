import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { COLORS } from '../constants/colors'
import { WIPE_DURATION } from '../constants/timing'

export const OrangeWipe: React.FC = () => {
  const frame = useCurrentFrame()

  // Expand phase: frames 0–6
  const expandProgress = interpolate(frame, [0, 6], [0, 1], {
    extrapolateRight: 'clamp',
  })

  // Contract phase: frames 12–18
  const contractProgress = interpolate(frame, [12, WIPE_DURATION], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Radial scale: grows from 0 to cover full screen, then shrinks
  const scale = frame < 12 ? expandProgress : 1 - contractProgress

  // The circle needs to be large enough to cover 1080x1920 from center
  // Diagonal = sqrt(540^2 + 960^2) ≈ 1102px → use 1200px radius
  const radius = scale * 1200

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: radius * 2,
          height: radius * 2,
          borderRadius: '50%',
          backgroundColor: COLORS.primary,
        }}
      />
    </AbsoluteFill>
  )
}
