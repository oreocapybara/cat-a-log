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
import { Hook } from './scenes/Hook'
import { LogoReveal } from './scenes/LogoReveal'
import { FirstTag } from './scenes/FirstTag'
import { TechClip } from './scenes/TechClip'
import { MapPopulates } from './scenes/MapPopulates'

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
        component={Hook}
        durationInFrames={SCENE_DURATIONS.hook}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="LogoReveal"
        component={LogoReveal}
        durationInFrames={SCENE_DURATIONS.logoReveal}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="FirstTag"
        component={FirstTag}
        durationInFrames={SCENE_DURATIONS.firstTag}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="TechClip"
        component={TechClip}
        durationInFrames={SCENE_DURATIONS.techClip}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="MapPopulates"
        component={MapPopulates}
        durationInFrames={SCENE_DURATIONS.mapPopulates}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  )
}
