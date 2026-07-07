import React from 'react'
import { Composition } from 'remotion'
import {
  FPS,
  WIDTH,
  HEIGHT,
  SCENE_DURATIONS,
  TOTAL_DURATION,
  WIPE_DURATION,
} from './constants/timing'
import { OrangeWipe } from './components/OrangeWipe'

const Placeholder: React.FC = () => (
  <div
    style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#FFF7ED',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <p style={{ fontSize: 48, color: '#2A1B12' }}>Scene Placeholder</p>
  </div>
)

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DemoVideo"
        component={Placeholder}
        durationInFrames={TOTAL_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="OrangeWipe"
        component={OrangeWipe}
        durationInFrames={WIPE_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Hook"
        component={Placeholder}
        durationInFrames={SCENE_DURATIONS.hook}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  )
}
