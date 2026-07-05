// A given catch (cat id or sighting id) always renders the same foil
// angle/offset — stable across re-fetches and re-shares — while different
// catches land on different values. mulberry32 seeded from a simple string
// hash of the id; no crypto needed, this only drives a CSS gradient angle.
function hashSeed(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (Math.imul(31, hash) + id.charCodeAt(i)) | 0
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type CatchCardFoil = {
  angleDeg: number
  offsetPercent: number
}

export function getCatchCardFoil(id: string): CatchCardFoil {
  const rand = mulberry32(hashSeed(id))
  return {
    angleDeg: 100 + rand() * 30,
    offsetPercent: 25 + rand() * 50,
  }
}
