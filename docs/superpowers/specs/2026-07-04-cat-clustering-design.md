# Cat Marker Clustering — Design

## Goal

In dense areas, `nearby_cats` can return enough pins that they visually overlap and are slow to render/interact with individually. Group nearby pins into clusters that break apart as the user zooms in, using the same photo-forward visual language as individual cat pins so it stays engaging rather than a plain counter.

---

## Cluster icon

Reuses the existing photo-pin style rather than a plain dot:

- **Size**: 52px circle (larger than the 44px single-cat pin, so it visibly reads as "more than one").
- **Photo stack**: up to 3 of the member cats' photos, tightly fanned/overlapped, rounded, each with a thin white border, matching the trading-card feel of individual pins.
- **Count badge**: small pill (e.g. `+12`) at bottom-right, same visual weight/position as the existing welfare badge on individual pins.
- **Welfare urgency**: if any member cat carries `needs_medical` or `possible_rabies`, the cluster gets that tier's colored ring + pulsing badge. Computed by flattening all member cats' tags into one array and running it through the existing `getWelfareStyle` (in `cat-map.tsx`) — no new priority logic, just a bigger input.
- **No staleness opacity on clusters** — opacity is a per-pin signal about one sighting's age; it doesn't carry meaning averaged over a group. Clusters always render at full opacity. Individual pins keep their opacity once a cluster breaks apart into single markers.

---

## Interaction

Tapping a cluster zooms the map in to break it apart — no list/preview view.

- On click: `map.flyTo([cluster.lat, cluster.lng], expansionZoom)`.
- `expansionZoom` comes from `supercluster`'s `index.getClusterExpansionZoom(clusterId)` — the zoom level at which this specific cluster first splits into smaller clusters/individual pins.

---

## Components changed

### New dependency: `supercluster`

Headless spatial-clustering library (no DOM/Leaflet ties). Chosen over `leaflet.markercluster` because that plugin manages its own imperative Leaflet layer group, which would fight with how `cat-map.tsx` already renders markers declaratively via react-leaflet `<Marker>` with memoized custom icons and mount animations. `supercluster` instead is a pure function — given points + bounds + zoom, return clusters or singles — leaving 100% of rendering under our existing custom-icon system.

### New file: `lib/clustering.ts`

```ts
export type MapPoint =
  | { type: 'single'; cat: NearbyCat }
  | { type: 'cluster'; id: number; lat: number; lng: number; count: number; cats: NearbyCat[] }

export function buildClusterIndex(cats: NearbyCat[]): Supercluster
export function getMapPoints(index: Supercluster, bounds: L.LatLngBounds, zoom: number): MapPoint[]
export function getClusterExpansionZoom(index: Supercluster, clusterId: number): number
```

- `buildClusterIndex` constructs a `supercluster` instance with `radius: 60, maxZoom: 16, minPoints: 2` (library default), loading each cat as a GeoJSON point feature with the original `NearbyCat` object stored in `properties.cat` (so cluster leaves hand back real cat objects, not just aggregated stats).
- `getMapPoints` calls `index.getClusters([west, south, east, north], zoom)`; for cluster features it calls `index.getLeaves(properties.cluster_id, Infinity)` to recover the member cats; for leaf features it unwraps `properties.cat` directly.

### `app/(app)/map/components/cat-map.tsx`

1. Add a small internal viewport-tracking component (sibling to the existing `MapEvents`) that captures `map.getBounds()` / `map.getZoom()` on `moveend` and once on initial mount, storing them in `CatMap`'s local state. This is separate from the existing `onMoveEnd` prop (which drives the `nearby_cats` refetch in `page.tsx`) — clustering is purely a client-side rendering concern over already-fetched cats and does not touch `page.tsx` or the data-fetching layer.
2. `useMemo` builds the cluster index from `cats` (rebuilt only when `cats` changes).
3. `useMemo` computes `MapPoint[]` from the index + current viewport (bounds/zoom), recomputed only on `moveend` — not on every intermediate pan/zoom animation frame, matching how cat data already only refetches at `moveend`.
4. Rendering swaps per point: `type: 'single'` → existing `<CatMarker>` unchanged; `type: 'cluster'` → new `<ClusterMarker>`.
5. New `ClusterMarker` component (same file, alongside `CatMarker`): builds its own `L.divIcon` (photo stack + count badge + welfare ring, per above), calls `useMap()` directly (same pattern as `FlyTo`/`MapEvents`) and flies to the expansion zoom on click. Memoizes its icon the same way `CatMarker` does, so unrelated re-renders don't restart its mount animation.

No changes to `page.tsx`, `lib/geo.ts`, or the Supabase/`nearby_cats` query.

---

## What this feature does NOT do

- No changes to `nearby_cats` or any data-fetching — clustering only reorganizes how the already-fetched viewport cats are rendered.
- No cluster list/preview UI — tapping a cluster always zooms in, never shows a sub-list.
- No clustering of the user-location marker.
- No configurable cluster radius/zoom thresholds — fixed defaults (`radius: 60`, `maxZoom: 16`).
- No persistence of cluster/expansion state across sessions or navigation.

---

## Verification

No test framework in this repo. Manual verification:

1. Zoom out over an area with several nearby cats until pins visually overlap — confirm they merge into a single cluster bubble showing a photo stack + count.
2. Tap the cluster — confirm the map flies/zooms in and the cluster breaks apart into smaller clusters or individual pins.
3. Tag a cat with `needs_medical` inside a cluster — confirm the cluster shows the medical-urgency ring/pulse instead of the default cluster styling.
4. Zoom in past the point where every cat is its own pin — confirm individual pins render exactly as before (staleness opacity, welfare badges, selection, bounce-in animation all unaffected).
5. Pan/zoom rapidly — confirm clusters don't visibly flicker or recompute mid-gesture, only settling once the gesture ends.
