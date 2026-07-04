import Supercluster from 'supercluster'
import type { LatLngBounds } from 'leaflet'
import type { NearbyCat } from '@/lib/supabase/types'

type CatPointProperties = { cat: NearbyCat }

export type MapPoint =
  | { type: 'single'; cat: NearbyCat }
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
    return { type: 'single', cat: props.cat }
  })
}
