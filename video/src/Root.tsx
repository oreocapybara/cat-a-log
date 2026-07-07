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
import { AIMatch } from './scenes/AIMatch'
import { VotingVision } from './scenes/VotingVision'
import { TechSimilarity } from './scenes/TechSimilarity'
import { WelfareFlag } from './scenes/WelfareFlag'
import { CatchCard } from './scenes/CatchCard'
import { TechStack } from './scenes/TechStack'
import { Closing } from './scenes/Closing'

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
      <Composition
        id="AIMatch"
        component={AIMatch}
        durationInFrames={SCENE_DURATIONS.aiMatch}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="VotingVision"
        component={VotingVision}
        durationInFrames={SCENE_DURATIONS.votingVision}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="TechSimilarity"
        component={TechSimilarity}
        durationInFrames={SCENE_DURATIONS.techSimilarity}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="WelfareFlag"
        component={WelfareFlag}
        durationInFrames={SCENE_DURATIONS.welfareFlag}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="CatchCard"
        component={CatchCard}
        durationInFrames={SCENE_DURATIONS.catchCard}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="TechStack"
        component={TechStack}
        durationInFrames={SCENE_DURATIONS.techStack}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Closing"
        component={Closing}
        durationInFrames={SCENE_DURATIONS.closing}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  )
}
