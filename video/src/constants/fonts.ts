import { loadFont as loadVarelaRound } from '@remotion/google-fonts/VarelaRound'

const { fontFamily: varelaRoundFamily } = loadVarelaRound()

// Geist is not available in @remotion/google-fonts — using system sans-serif stack
const geistFamily = 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

export const FONTS = {
  headline: { fontFamily: varelaRoundFamily },
  body: { fontFamily: geistFamily },
} as const
