import React from 'react'
import { Series } from 'remotion'
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
import { SCENE_DURATIONS, WIPE_DURATION } from './constants/timing'

export const DemoVideo: React.FC = () => {
  return (
    <Series>
      {/* Act 0: Hook + Logo */}
      <Series.Sequence durationInFrames={SCENE_DURATIONS.hook}>
        <Hook />
      </Series.Sequence>
      <Series.Sequence durationInFrames={WIPE_DURATION}>
        <OrangeWipe />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.logoReveal}>
        <LogoReveal />
      </Series.Sequence>
      <Series.Sequence durationInFrames={WIPE_DURATION}>
        <OrangeWipe />
      </Series.Sequence>

      {/* Act 1: First Tag + Tech */}
      <Series.Sequence durationInFrames={SCENE_DURATIONS.firstTag}>
        <FirstTag />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.techClip}>
        <TechClip />
      </Series.Sequence>
      <Series.Sequence durationInFrames={WIPE_DURATION}>
        <OrangeWipe />
      </Series.Sequence>

      {/* Act 2: Map + AI Match + Voting + Tech */}
      <Series.Sequence durationInFrames={SCENE_DURATIONS.mapPopulates}>
        <MapPopulates />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.aiMatch}>
        <AIMatch />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.votingVision}>
        <VotingVision />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.techSimilarity}>
        <TechSimilarity />
      </Series.Sequence>
      <Series.Sequence durationInFrames={WIPE_DURATION}>
        <OrangeWipe />
      </Series.Sequence>

      {/* Act 3: Welfare + Card + Stack + Close */}
      <Series.Sequence durationInFrames={SCENE_DURATIONS.welfareFlag}>
        <WelfareFlag />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.catchCard}>
        <CatchCard />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.techStack}>
        <TechStack />
      </Series.Sequence>
      <Series.Sequence durationInFrames={WIPE_DURATION}>
        <OrangeWipe />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.closing}>
        <Closing />
      </Series.Sequence>
    </Series>
  )
}
