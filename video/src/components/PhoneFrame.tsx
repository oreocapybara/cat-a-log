import React from 'react'
import { AbsoluteFill } from 'remotion'

type PhoneFrameProps = {
  children: React.ReactNode
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({ children }) => {
  const bezelRadius = 44
  const frameWidth = 380
  const frameHeight = 760
  const bezelThickness = 12
  const innerWidth = frameWidth - bezelThickness * 2
  const innerHeight = frameHeight - bezelThickness * 2

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Phone bezel */}
      <div
        style={{
          width: frameWidth,
          height: frameHeight,
          borderRadius: bezelRadius,
          backgroundColor: '#1A1A1A',
          padding: bezelThickness,
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          position: 'relative',
        }}
      >
        {/* Notch */}
        <div
          style={{
            position: 'absolute',
            top: bezelThickness,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 120,
            height: 28,
            backgroundColor: '#1A1A1A',
            borderRadius: '0 0 14px 14px',
            zIndex: 10,
          }}
        />
        {/* Screen area */}
        <div
          style={{
            width: innerWidth,
            height: innerHeight,
            borderRadius: bezelRadius - bezelThickness,
            backgroundColor: '#FFFFFF',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {children}
        </div>
      </div>
    </AbsoluteFill>
  )
}
