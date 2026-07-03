// Same simplified flat-earth approximation nearby_cats() uses server-side —
// fine at these distances, avoids pulling in a geo library.
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const latDelta = lat2 - lat1
  const lngDelta = (lng2 - lng1) * Math.cos((lat1 * Math.PI) / 180)
  return 111.0 * Math.sqrt(latDelta ** 2 + lngDelta ** 2)
}
