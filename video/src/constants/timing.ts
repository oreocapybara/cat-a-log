export const FPS = 30
export const WIDTH = 1080
export const HEIGHT = 1920

/** Per-scene durations in frames */
export const SCENE_DURATIONS = {
  hook: 600, // 0:00–0:20
  logoReveal: 150, // 0:20–0:25
  firstTag: 1650, // 0:25–1:20
  techClip: 300, // 1:20–1:30
  mapPopulates: 750, // 1:30–1:55
  aiMatch: 900, // 1:55–2:25
  votingVision: 750, // 2:25–2:50
  techSimilarity: 300, // 2:50–3:00
  welfareFlag: 750, // 3:00–3:25
  catchCard: 750, // 3:25–3:50
  techStack: 300, // 3:50–4:00
  closing: 450, // 4:00–4:15
} as const

/** Orange wipe transition duration in frames */
export const WIPE_DURATION = 18

/** Total video duration including transitions */
export const TOTAL_DURATION =
  Object.values(SCENE_DURATIONS).reduce((sum, d) => sum + d, 0) + WIPE_DURATION * 5 // 5 wipe transitions between major sections
