# Cat Marker Clustering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group nearby cat pins on the map into photo-stack cluster bubbles that break apart into individual pins (or smaller clusters) as the user zooms in, using `supercluster` for the spatial grouping and the app's existing custom-icon rendering for the visuals.

**Architecture:** A new pure module (`lib/clustering.ts`) wraps `supercluster` to turn `NearbyCat[]` + current map viewport into a flat `MapPoint[]` (singles or clusters). `cat-map.tsx` tracks the live viewport (bounds/zoom) internally, recomputes `MapPoint[]` only on `moveend`, and renders each point as the existing `<CatMarker>` (singles) or a new `<ClusterMarker>` (clusters) — both are `L.divIcon`-based, memoized the same way, and reuse the existing welfare-tier logic already in `cat-map.tsx`.

**Tech Stack:** Next.js 16 / React 19 / TypeScript strict, `react-leaflet` 5 + `leaflet`, new dependency `supercluster` (+ `@types/supercluster`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-04-cat-clustering-design.md` — follow it exactly for visual/interaction details.
- No changes to `page.tsx`, `lib/geo.ts`, or the `nearby_cats` Supabase query/RPC — clustering is a pure client-side rendering concern layered on top of already-fetched cats.
- No new UI for cluster lists/previews — tapping a cluster always zooms in (`map.flyTo` to `getClusterExpansionZoom`), never shows a sub-list.
- No clustering of the user-location marker.
- Fixed clustering config: `radius: 60`, `maxZoom: 16` (no user-facing configurability).
- **No test framework exists in this repo** (`package.json` has no test script, no jest/vitest/testing-library anywhere) and the sibling staleness/directions feature (`lib/geo.ts`'s `getStalenessOpacity`/`formatLastSeen`) shipped with zero test files, verified only via `npm run type-check` / `npm run lint` / manual browser checks. This plan follows that established convention rather than introducing new test infrastructure — each task's "test" step is a type-check/lint pass plus, where relevant, a manual browser check.
- Conventional Commits required, scope `map` for all commits here (see `AGENTS.md`).

---

### Task 1: Add `supercluster` dependency

**Files:**

- Modify: `package.json`, `package-lock.json` (via `npm install`)

**Interfaces:**

- Produces: `supercluster` importable as `import Supercluster from 'supercluster'` with types from `@types/supercluster`.

- [ ] **Step 1: Install the dependency**

Run:

```bash
npm install supercluster
npm install --save-dev @types/supercluster
```

Expected: `package.json` gains `"supercluster": "^8.0.1"` under `dependencies` and `"@types/supercluster": "^7.1.3"` under `devDependencies`.

- [ ] **Step 2: Verify types resolve**

Create a scratch file `lib/_scratch.ts` with:

```ts
import Supercluster from 'supercluster'
const s = new Supercluster()
void s
```

Run: `npm run type-check`
Expected: passes with no errors (confirms `@types/geojson`, a transitive dependency of `@types/supercluster`, resolved correctly). If it fails with a missing `geojson` module error, run `npm install --save-dev @types/geojson` and re-run `npm run type-check`.

Delete `lib/_scratch.ts` once it passes — it was only there to prove the install works.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(map): add supercluster dependency for pin clustering"
```

---

### Task 2: `lib/clustering.ts` — clustering data layer

**Files:**

- Create: `lib/clustering.ts`

**Interfaces:**

- Consumes: `NearbyCat` type from `@/lib/supabase/types` (fields used: `id`, `lat`, `lng`, `primary_photo_url`, plus the full object is carried through untouched).
- Produces:

  - `export type MapPoint = { type: 'single'; cat: NearbyCat } | { type: 'cluster'; id: number; lat: number; lng: number; count: number; cats: NearbyCat[]; expansionZoom: number }`
  - `export function buildClusterIndex(cats: NearbyCat[]): Supercluster<{ cat: NearbyCat }>`
  - `export function getMapPoints(index: Supercluster<{ cat: NearbyCat }>, bounds: LatLngBounds, zoom: number): MapPoint[]`
  - These two functions are what `cat-map.tsx` (Task 3) imports directly.

- [ ] **Step 1: Write the module**

```ts
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
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: both pass with no errors or warnings on `lib/clustering.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/clustering.ts
git commit -m "feat(map): add supercluster-backed clustering module"
```

---

### Task 3: Render clusters in `CatMap`

**Files:**

- Modify: `app/(app)/map/components/cat-map.tsx`

**Interfaces:**

- Consumes: `buildClusterIndex`, `getMapPoints`, `MapPoint` from `@/lib/clustering` (Task 2). Also reuses this file's own existing `getWelfareStyle`, `welfareBadgeHtml`, `NO_TAGS`, `CatMarker` — none of those change shape.
- Produces: no new exports — `CatMap`'s public props are unchanged. Internally adds `ClusterViewportTracker` and `ClusterMarker` components and a `makeClusterIcon` function, all module-private.

- [ ] **Step 1: Update imports**

In `app/(app)/map/components/cat-map.tsx`, change:

```ts
import { useEffect, useMemo } from 'react'
```

to:

```ts
import { useEffect, useMemo, useState } from 'react'
```

and add, after the existing `import { getStalenessOpacity } from '@/lib/geo'` line:

```ts
import { buildClusterIndex, getMapPoints, type MapPoint } from '@/lib/clustering'
```

- [ ] **Step 2: Add the viewport tracker component**

Add this new component directly below the existing `FlyTo` component (after its closing brace, before the `CatMarker` comment block):

```tsx
type ClusterViewport = { bounds: L.LatLngBounds; zoom: number }

// Recomputes clusters only when a pan/zoom gesture settles (moveend), not on
// every intermediate animation frame — matches how cat data itself only
// refetches at moveend (see page.tsx's onMoveEnd), and avoids cluster
// bubbles visibly thrashing mid-gesture.
function ClusterViewportTracker({ onChange }: { onChange: (viewport: ClusterViewport) => void }) {
  const map = useMapEvents({
    moveend() {
      onChange({ bounds: map.getBounds(), zoom: map.getZoom() })
    },
  })
  useEffect(() => {
    onChange({ bounds: map.getBounds(), zoom: map.getZoom() })
  }, [map, onChange])
  return null
}
```

- [ ] **Step 3: Add the cluster icon builder**

Add this function directly below the existing `welfareBadgeHtml` function (before the `makeCatIcon` JSDoc comment):

```ts
const CLUSTER_PHOTO_OFFSETS = [
  { top: 2, left: 2, z: 3 },
  { top: 12, left: 12, z: 2 },
  { top: 22, left: 22, z: 1 },
]

// Cluster bubble: a clipped-circle stack of up to 3 member photos (fanned
// diagonally) plus a count badge, so a cluster reads as "a pile of cats"
// rather than a plain counter — matches the photo-forward pin style used
// everywhere else on the map. Welfare urgency is computed by flattening every
// member cat's tags into one list and running the existing priority logic
// (getWelfareStyle) over it, so a single needs_medical cat inside a cluster
// of 20 still surfaces the same red ring/pulse an individual pin would show.
function makeClusterIcon(
  point: Extract<MapPoint, { type: 'cluster' }>,
  catTags: Map<string, CatTag['tag'][]>
): L.DivIcon {
  const allTags = point.cats.flatMap((cat) => catTags.get(cat.id) ?? NO_TAGS)
  const welfare = getWelfareStyle(allTags)
  const photoFilter = welfare.desaturate ? 'filter:grayscale(1) opacity(0.75);' : ''

  const photosHtml = point.cats
    .slice(0, 3)
    .map((cat, i) => {
      const encodedUrl = cat.primary_photo_url.replace(/'/g, '%27').replace(/"/g, '%22')
      const { top, left, z } = CLUSTER_PHOTO_OFFSETS[i]
      return `
        <div style="
          position:absolute;
          top:${top}px;
          left:${left}px;
          width:26px;
          height:26px;
          border-radius:50%;
          border:1.5px solid #fff;
          background-image:url('${encodedUrl}');
          background-size:cover;
          background-position:center;
          z-index:${z};
          ${photoFilter}
        "></div>
      `
    })
    .join('')

  const countLabel = point.count > 99 ? '99+' : String(point.count)

  const html = `
    <div class="map-marker-pop" style="position:relative;width:52px;height:52px;">
      <div style="
        position:relative;
        width:52px;
        height:52px;
        border-radius:50%;
        border:2.5px solid ${welfare.borderColor};
        background:#fff;
        overflow:hidden;
        box-shadow:0 2px 6px rgba(0,0,0,0.2);
      ">${photosHtml}</div>
      ${welfareBadgeHtml(welfare.badge, 18)}
      <div style="
        position:absolute;
        bottom:-2px;
        right:-2px;
        min-width:20px;
        height:20px;
        padding:0 4px;
        border-radius:9999px;
        background:#f97316;
        color:#fff;
        font-size:10px;
        font-weight:700;
        display:flex;
        align-items:center;
        justify-content:center;
        border:2px solid #fff;
        box-shadow:0 1px 3px rgba(0,0,0,0.3);
      ">${countLabel}</div>
    </div>
  `
  return L.divIcon({ className: '', html, iconSize: [52, 52], iconAnchor: [26, 26] })
}
```

- [ ] **Step 4: Add the `ClusterMarker` component**

Add directly below the existing `CatMarker` component:

```tsx
// Tapping a cluster always zooms in to break it apart — no list/preview view
// (see design spec). getClusterExpansionZoom was already computed for this
// exact point in lib/clustering.ts, straight off the same index, so it's safe
// to fly to directly here without re-querying the index.
function ClusterMarker({
  point,
  catTags,
  dimmed,
}: {
  point: Extract<MapPoint, { type: 'cluster' }>
  catTags: Map<string, CatTag['tag'][]>
  dimmed: boolean
}) {
  const map = useMap()
  const icon = useMemo(() => makeClusterIcon(point, catTags), [point, catTags])

  return (
    <Marker
      position={[point.lat, point.lng]}
      icon={icon}
      opacity={dimmed ? 0.55 : 1}
      eventHandlers={{ click: () => map.flyTo([point.lat, point.lng], point.expansionZoom) }}
    />
  )
}
```

- [ ] **Step 5: Wire clustering state into `CatMap` and swap the render loop**

In the `CatMap` function body, directly after the existing `const { resolvedTheme } = useTheme()` line, add:

```tsx
const [clusterViewport, setClusterViewport] = useState<ClusterViewport | null>(null)
const clusterIndex = useMemo(() => buildClusterIndex(cats), [cats])
const points = useMemo<MapPoint[]>(() => {
  if (!clusterViewport) return cats.map((cat): MapPoint => ({ type: 'single', cat }))
  return getMapPoints(clusterIndex, clusterViewport.bounds, clusterViewport.zoom)
}, [cats, clusterIndex, clusterViewport])
```

Then replace the existing render block:

```tsx
      <MapEvents onMoveEnd={onMoveEnd} onUserDrag={onUserDrag} />
      <FlyTo target={flyTo} />
      <Marker position={userLocation} icon={userIcon} />
      {cats.map((cat, index) => (
        <CatMarker
          key={cat.id}
          cat={cat}
          index={index}
          selectedCatId={selectedCatId}
          tags={catTags.get(cat.id) ?? NO_TAGS}
          onSelectCat={onSelectCat}
        />
      ))}
```

with:

```tsx
      <MapEvents onMoveEnd={onMoveEnd} onUserDrag={onUserDrag} />
      <ClusterViewportTracker onChange={setClusterViewport} />
      <FlyTo target={flyTo} />
      <Marker position={userLocation} icon={userIcon} />
      {points.map((point, index) =>
        point.type === 'single' ? (
          <CatMarker
            key={point.cat.id}
            cat={point.cat}
            index={index}
            selectedCatId={selectedCatId}
            tags={catTags.get(point.cat.id) ?? NO_TAGS}
            onSelectCat={onSelectCat}
          />
        ) : (
          <ClusterMarker
            key={`cluster-${point.id}`}
            point={point}
            catTags={catTags}
            dimmed={selectedCatId !== null}
          />
        )
      )}
```

- [ ] **Step 6: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: both pass with no errors.

- [ ] **Step 7: Manual browser check — clustering appears and expands**

Run: `npm run dev`, open the map in a browser at a zoom level where 2+ nearby cats overlap (zoom out until pins visually merge — if there's only a handful of test cats seeded far apart, temporarily zoom out or use browser devtools to confirm at least one cluster bubble renders showing a photo stack + count).

Expected:

- A cluster bubble appears showing up to 3 overlapping cat photos and a count pill.
- Clicking/tapping the cluster flies/zooms the map in and the cluster breaks apart into smaller clusters or individual pins.
- Zooming all the way in still shows individual pins exactly as before (staleness opacity, welfare badges, bounce-in animation, selection) — clustering must not have regressed single-pin rendering.

- [ ] **Step 8: Manual browser check — welfare urgency propagates to clusters**

Tag one cat inside a cluster with `needs_medical` (via the existing tag flow or by directly checking a cat that already has the tag, if one exists in test data) and confirm the cluster bubble shows the medical-urgency red ring + pulsing badge instead of the default orange ring.

- [ ] **Step 9: Commit**

```bash
git add "app/(app)/map/components/cat-map.tsx"
git commit -m "feat(map): cluster nearby cat pins with photo-stack bubbles"
```

---

### Task 4: Full spec verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full local quality gate**

Run: `npm run format:check && npm run lint && npm run type-check && npm run build`
Expected: all four pass — this mirrors the CI pipeline in `.github/workflows/ci.yml`.

- [ ] **Step 2: Walk the spec's verification checklist**

Using `npm run dev`, confirm each item from `docs/superpowers/specs/2026-07-04-cat-clustering-design.md`'s Verification section:

1. Zoom out over an area with several nearby cats until pins overlap → they merge into one cluster bubble with photo stack + count.
2. Tap the cluster → map flies/zooms in and the cluster breaks apart.
3. A cluster containing a `needs_medical` cat shows the medical-urgency ring/pulse.
4. Zooming in past clustering range renders individual pins unaffected (staleness opacity, welfare badges, selection, bounce-in animation all intact).
5. Rapid pan/zoom doesn't visibly flicker clusters mid-gesture — they only resettle once the gesture ends.

No commit for this task — it's a verification-only pass. If any check fails, fix the relevant code in Task 3's file and re-run this task's steps.
