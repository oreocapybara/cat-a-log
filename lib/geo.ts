// Same simplified flat-earth approximation nearby_cats() uses server-side —
// fine at these distances, avoids pulling in a geo library.
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const latDelta = lat2 - lat1
  const lngDelta = (lng2 - lng1) * Math.cos((lat1 * Math.PI) / 180)
  return 111.0 * Math.sqrt(latDelta ** 2 + lngDelta ** 2)
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

// A cat pin marks where it was last tagged, not where it is now — opacity
// passively signals how stale that location might be. Size stays constant;
// shrinking pins on a crowded map would hurt tappability for little signal.
export function getStalenessOpacity(createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  if (ageMs < DAY_MS) return 1
  if (ageMs < 7 * DAY_MS) return 0.7
  return 0.4
}

export function formatLastSeen(createdAt: string): string {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  if (ageMs < HOUR_MS) return 'Seen just now'
  if (ageMs < DAY_MS) return `Seen ${Math.floor(ageMs / HOUR_MS)}h ago`
  const days = Math.floor(ageMs / DAY_MS)
  if (days < 7) return `Seen ${days} day${days === 1 ? '' : 's'} ago`
  const weeks = Math.floor(days / 7)
  if (weeks > 4) return 'Seen over a month ago'
  return `Seen ${weeks} week${weeks === 1 ? '' : 's'} ago`
}
