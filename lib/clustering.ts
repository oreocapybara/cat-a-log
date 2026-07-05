import Supercluster from 'supercluster'
import type { LatLngBounds } from 'leaflet'
import { distanceKm, offsetLatLng } from './geo.ts'
import type { NearbyCat } from '@/lib/supabase/types'

type CatPointProperties = { cat: NearbyCat }

export type MapPoint =
  | { type: 'single'; cat: NearbyCat; lat: number; lng: number }
  | {
      type: 'cluster'
      id: number
      lat: number
      lng: number
      count: number
      cats: NearbyCat[]
      expansionZoom: number
    }

// Fixed clustering config — see docs/superpowers/specs/2026-07-04-cat-clustering-design.md.
// No user-facing configurability; these are the library defaults tuned for a
// mobile map (60px grouping radius, stop clustering past zoom 16 where pins
// are already spread out enough to tap individually).
export function buildClusterIndex(cats: NearbyCat[]): Supercluster<CatPointProperties> {
  const index = new Supercluster<CatPointProperties>({ radius: 60, maxZoom: 16 })
  index.load(
    cats.map((cat) => ({
      type: 'Feature' as const,
      properties: { cat },
      geometry: { type: 'Point' as const, coordinates: [cat.lng, cat.lat] },
    }))
  )
  return index
}

export function getMapPoints(
  index: Supercluster<CatPointProperties>,
  bounds: LatLngBounds,
  zoom: number
): MapPoint[] {
  const bbox: [number, number, number, number] = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ]
  return index.getClusters(bbox, Math.round(zoom)).map((feature): MapPoint => {
    const [lng, lat] = feature.geometry.coordinates
    const props = feature.properties
    if ('cluster' in props) {
      return {
        type: 'cluster',
        id: props.cluster_id,
        lat,
        lng,
        count: props.point_count,
        cats: index.getLeaves(props.cluster_id, Infinity).map((leaf) => leaf.properties.cat),
        expansionZoom: index.getClusterExpansionZoom(props.cluster_id),
      }
    }
    return { type: 'single', cat: props.cat, lat, lng }
  })
}

// ponytail: real-world distance is fixed regardless of zoom level, so a
// small radius measures as only a few screen px even at max practical zoom —
// 24m tuned via manual testing to give clearly separated, independently
// tappable pins while still reading as "invisible until zoomed in."
const NUDGE_RADIUS_M = 24
// A mobile map tap easily lands several meters off even when a user intends
// "the exact same spot" — 1m was too strict and let two such taps form two
// separate groups, whose independent 24m fans then visually collided with
// each other. Widened to match the nudge radius so "roughly the same spot"
// taps merge into one shared, evenly-spaced fan instead.
const OVERLAP_THRESHOLD_KM = 0.02 // 20 meters

type SinglePoint = Extract<MapPoint, { type: 'single' }>

// Cats tagged at the exact same spot (or within GPS jitter) would otherwise
// render as pins stacked perfectly on top of each other — no amount of
// zooming ever separates two geographically identical points, since they
// have no pixel distance to grow. Fan every point but the first of each
// overlapping group out around it by a real (not screen-pixel) distance, so
// separation is invisible when zoomed out and grows naturally as the map
// zooms in.
//
// ponytail: grouping is O(n^2) and single-linkage from the first point found
// (not transitive union-find) — fine for viewport-sized point counts and the
// realistic case of a handful of cats stacked at one exact spot. Upgrade to
// a real spatial index / union-find if viewports start holding thousands of
// points or long chains of near-duplicates.
export function separateOverlappingCats(points: MapPoint[]): MapPoint[] {
  const singleIndices: number[] = []
  points.forEach((point, index) => {
    if (point.type === 'single') singleIndices.push(index)
  })

  const used = new Set<number>()
  const groups: number[][] = []
  for (const i of singleIndices) {
    if (used.has(i)) continue
    const anchor = points[i] as SinglePoint
    const group = [i]
    used.add(i)
    for (const j of singleIndices) {
      if (used.has(j)) continue
      const candidate = points[j] as SinglePoint
      if (distanceKm(anchor.lat, anchor.lng, candidate.lat, candidate.lng) < OVERLAP_THRESHOLD_KM) {
        group.push(j)
        used.add(j)
      }
    }
    if (group.length > 1) groups.push(group)
  }

  if (groups.length === 0) return points

  const result = [...points]
  for (const group of groups) {
    const anchor = result[group[0]] as SinglePoint
    for (let k = 1; k < group.length; k++) {
      const bearing = (2 * Math.PI * k) / group.length
      const [lat, lng] = offsetLatLng(anchor.lat, anchor.lng, bearing, NUDGE_RADIUS_M)
      const point = result[group[k]] as SinglePoint
      result[group[k]] = { ...point, lat, lng }
    }
  }
  return result
}
