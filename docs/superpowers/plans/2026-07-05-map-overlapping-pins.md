# Separating Overlapping Map Pins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When two or more cats sit at the exact same (or near-identical, <1m) coordinates, their map pins currently render stacked perfectly on top of each other with no way to ever separate them by zooming. Nudge every pin but the first in each overlapping group outward by a small real-world distance so they visually fan apart and become independently tappable.

**Architecture:** A pure post-processing pass over the `MapPoint[]` array `cat-map.tsx` already builds from clustering — detects near-duplicate `single` points (O(n²) scan, viewport-sized data), leaves the first of each group at its true position, and fans the rest around it using a new geo-offset helper. The underlying `cat` object is never mutated; only the point's render `lat`/`lng` shifts.

**Tech Stack:** TypeScript, no new dependencies. Verification uses Node 22's native TypeScript support (`node --experimental-strip-types`) for pure-function self-checks — no test framework exists in this repo and none is being added.

## Global Constraints

- Overlap detection threshold: **under 1 meter** (great-circle distance).
- Nudge radius: **2 meters**, fanned evenly by angle (`2π * i / groupSize`) around the group's first (anchor) point.
- The anchor (first point in each group) never moves.
- `cat.lat`/`cat.lng` on the underlying `NearbyCat` object must never be mutated — only the `MapPoint`'s own `lat`/`lng` (the render position) changes.
- `cluster`-type `MapPoint`s are untouched by this feature.
- No new npm dependencies.
- No test framework added — self-checks run via `node --experimental-strip-types <file>.mts`.
- Commits follow Conventional Commits, scope `map` (per `AGENTS.md`), no `Co-Authored-By` trailer.
- All work happens on a new branch off `main` (per `AGENTS-WORKFLOW.md` / user request), never committed directly to `main`.

---

### Task 0: Create the feature branch

**Files:** none

- [ ] **Step 1: Confirm a clean working tree and branch off `main`**

```bash
git status --short
git checkout main
git pull --ff-only
git checkout -b feat/map-nudge-overlapping-pins
```

Expected: branch created, working tree clean.

---

### Task 1: `offsetLatLng` in `lib/geo.ts`

**Files:**

- Modify: `lib/geo.ts`
- Create: `lib/geo.selfcheck.mts`

**Interfaces:**

- Produces: `offsetLatLng(lat: number, lng: number, bearingRad: number, meters: number): [number, number]` — moves a point `meters` along compass bearing `bearingRad` (0 = north, clockwise, radians) and returns the new `[lat, lng]`. Uses the same flat-earth approximation as the existing `distanceKm` in this file (111 km/degree latitude, longitude scaled by `cos(lat)`), so it round-trips exactly with `distanceKm`.

- [ ] **Step 1: Write the self-check script (will fail — function doesn't exist yet)**

Create `lib/geo.selfcheck.mts`:

```ts
import assert from 'node:assert/strict'
import { distanceKm, offsetLatLng } from './geo.ts'

// Due north by 1000m should land ~1km away per distanceKm's own math, with no longitude change.
const [northLat, northLng] = offsetLatLng(0, 0, 0, 1000)
assert.ok(
  Math.abs(distanceKm(0, 0, northLat, northLng) - 1) < 0.0001,
  'offsetLatLng north bearing should move ~1km'
)
assert.ok(Math.abs(northLng - 0) < 1e-9, 'due-north offset should not change longitude')

// Due east by 1000m should also land ~1km away, this time via longitude only.
const [eastLat, eastLng] = offsetLatLng(0, 0, Math.PI / 2, 1000)
assert.ok(
  Math.abs(distanceKm(0, 0, eastLat, eastLng) - 1) < 0.0001,
  'offsetLatLng east bearing should move ~1km'
)
assert.ok(Math.abs(eastLat - 0) < 1e-9, 'due-east offset should not change latitude')

// A small 2m nudge (the real production radius) should round-trip through distanceKm too.
const [nearLat, nearLng] = offsetLatLng(40.0, -73.0, Math.PI / 4, 2)
assert.ok(
  Math.abs(distanceKm(40.0, -73.0, nearLat, nearLng) - 0.002) < 1e-6,
  '2m offset should measure back as 0.002km'
)

console.log('geo.selfcheck: OK')
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
node --experimental-strip-types lib/geo.selfcheck.mts
```

Expected: fails with something like `SyntaxError: The requested module './geo.ts' does not provide an export named 'offsetLatLng'`.

- [ ] **Step 3: Implement `offsetLatLng`**

Add to the end of `lib/geo.ts`:

```ts
// Inverse of the flat-earth approximation distanceKm uses above — moves a
// point `meters` along a compass bearing (0 = north, clockwise) and returns
// the new [lat, lng]. Used to fan out map pins that would otherwise render
// stacked on identical/near-identical coordinates (see lib/clustering.ts).
export function offsetLatLng(
  lat: number,
  lng: number,
  bearingRad: number,
  meters: number
): [number, number] {
  const km = meters / 1000
  const dLat = (km * Math.cos(bearingRad)) / 111.0
  const dLng = (km * Math.sin(bearingRad)) / (111.0 * Math.cos((lat * Math.PI) / 180))
  return [lat + dLat, lng + dLng]
}
```

- [ ] **Step 4: Run the self-check to confirm it passes**

```bash
node --experimental-strip-types lib/geo.selfcheck.mts
```

Expected: prints `geo.selfcheck: OK` and exits 0.

- [ ] **Step 5: Type-check and commit**

```bash
npm run type-check
git add lib/geo.ts lib/geo.selfcheck.mts
git commit -m "feat(map): add offsetLatLng geo helper"
```

---

### Task 2: `separateOverlappingCats` in `lib/clustering.ts`

**Files:**

- Modify: `lib/clustering.ts`
- Create: `lib/clustering.selfcheck.mts`

**Interfaces:**

- Consumes: `distanceKm`, `offsetLatLng` from `./geo.ts` (Task 1).
- Produces:

  - `MapPoint`'s `single` variant becomes `{ type: 'single'; cat: NearbyCat; lat: number; lng: number }` (adds `lat`/`lng` alongside the existing `cat`).
  - `separateOverlappingCats(points: MapPoint[]): MapPoint[]` — groups `single` points within 1m of each other, leaves each group's first member unchanged, and fans the rest around it at a 2m radius via `offsetLatLng`. `cluster` points and non-overlapping `single` points pass through unchanged (same array reference if nothing changed).

- [ ] **Step 1: Write the self-check script (will fail — export doesn't exist yet)**

Create `lib/clustering.selfcheck.mts`:

```ts
import assert from 'node:assert/strict'
import { separateOverlappingCats, type MapPoint } from './clustering.ts'
import { distanceKm } from './geo.ts'
import type { NearbyCat } from './supabase/types.ts'

function makeCat(id: string, lat: number, lng: number): NearbyCat {
  return {
    id,
    name: id,
    primary_photo_url: 'https://example.com/x.jpg',
    lat,
    lng,
    is_ear_tipped: false,
    notes: null,
    tagged_by: null,
    confidence_score: 1,
    created_at: new Date().toISOString(),
    distance_km: 0,
    times_spotted: 1,
  }
}

function single(cat: NearbyCat): MapPoint {
  return { type: 'single', cat, lat: cat.lat, lng: cat.lng }
}

// Two identical-coordinate cats: first stays put, second moves ~2m away.
{
  const a = makeCat('a', 40.7, -74.0)
  const b = makeCat('b', 40.7, -74.0)
  const [pointA, pointB] = separateOverlappingCats([single(a), single(b)]) as Extract<
    MapPoint,
    { type: 'single' }
  >[]
  assert.equal(pointA.lat, 40.7, 'anchor latitude unchanged')
  assert.equal(pointA.lng, -74.0, 'anchor longitude unchanged')
  const movedKm = distanceKm(pointA.lat, pointA.lng, pointB.lat, pointB.lng)
  assert.ok(Math.abs(movedKm - 0.002) < 1e-6, `expected ~2m separation, got ${movedKm * 1000}m`)
}

// Three cats stacked at the same spot: two satellites fan 120 degrees apart, both ~2m from anchor.
{
  const cats = [makeCat('a', 10, 10), makeCat('b', 10, 10), makeCat('c', 10, 10)]
  const [pointA, pointB, pointC] = separateOverlappingCats(cats.map(single)) as Extract<
    MapPoint,
    { type: 'single' }
  >[]
  assert.equal(pointA.lat, 10, 'anchor unmoved')
  assert.equal(pointA.lng, 10, 'anchor unmoved')
  const bKm = distanceKm(pointA.lat, pointA.lng, pointB.lat, pointB.lng)
  const cKm = distanceKm(pointA.lat, pointA.lng, pointC.lat, pointC.lng)
  assert.ok(Math.abs(bKm - 0.002) < 1e-6, 'second point ~2m from anchor')
  assert.ok(Math.abs(cKm - 0.002) < 1e-6, 'third point ~2m from anchor')
  const betweenSatellites = distanceKm(pointB.lat, pointB.lng, pointC.lat, pointC.lng)
  // Two points each 2m from a shared center, 120 degrees apart, are 2*sqrt(3) ~= 3.46m apart.
  assert.ok(
    Math.abs(betweenSatellites - 0.00346) < 0.0001,
    `expected satellites ~3.46m apart (120deg fan), got ${betweenSatellites * 1000}m`
  )
}

// Two cats far apart (>1m): both pass through untouched.
{
  const a = makeCat('a', 40.7, -74.0)
  const b = makeCat('b', 40.71, -74.0)
  const [pointA, pointB] = separateOverlappingCats([single(a), single(b)]) as Extract<
    MapPoint,
    { type: 'single' }
  >[]
  assert.equal(pointA.lat, a.lat)
  assert.equal(pointB.lat, b.lat)
  assert.equal(pointB.lng, b.lng)
}

console.log('clustering.selfcheck: OK')
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
node --experimental-strip-types lib/clustering.selfcheck.mts
```

Expected: fails with something like `SyntaxError: The requested module './clustering.ts' does not provide an export named 'separateOverlappingCats'`.

- [ ] **Step 3: Update `MapPoint` and `getMapPoints`, add `separateOverlappingCats`**

In `lib/clustering.ts`, add the import at the top (after the existing imports):

```ts
import { distanceKm, offsetLatLng } from '@/lib/geo'
```

Replace the `MapPoint` type definition:

```ts
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
```

In `getMapPoints`, change the leaf-feature return (currently `return { type: 'single', cat: props.cat }`) to:

```ts
return { type: 'single', cat: props.cat, lat, lng }
```

Append to the end of the file:

```ts
const OVERLAP_THRESHOLD_KM = 0.001 // 1 meter
const NUDGE_RADIUS_M = 2

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
```

- [ ] **Step 4: Run the self-check to confirm it passes**

```bash
node --experimental-strip-types lib/clustering.selfcheck.mts
```

Expected: prints `clustering.selfcheck: OK` and exits 0.

- [ ] **Step 5: Type-check and commit**

```bash
npm run type-check
git add lib/clustering.ts lib/clustering.selfcheck.mts
git commit -m "feat(map): add separateOverlappingCats to fan out stacked pins"
```

---

### Task 3: Wire the nudge into `cat-map.tsx`

**Files:**

- Modify: `app/(app)/map/components/cat-map.tsx`

**Interfaces:**

- Consumes: `separateOverlappingCats` (Task 2), updated `MapPoint` single variant carrying `lat`/`lng` (Task 2).

- [ ] **Step 1: Update the import**

Change:

```ts
import { buildClusterIndex, getMapPoints, type MapPoint } from '@/lib/clustering'
```

to:

```ts
import {
  buildClusterIndex,
  getMapPoints,
  separateOverlappingCats,
  type MapPoint,
} from '@/lib/clustering'
```

- [ ] **Step 2: Update `CatMarker` to take its render position as props**

Replace the `CatMarker` function (currently takes only `cat`, reads `cat.lat`/`cat.lng` for `position`):

```tsx
function CatMarker({
  cat,
  lat,
  lng,
  index,
  selectedCatId,
  tags,
  onSelectCat,
}: {
  cat: NearbyCat
  lat: number
  lng: number
  index: number
  selectedCatId: string | null
  tags: CatTag['tag'][]
  onSelectCat: (cat: NearbyCat) => void
}) {
  const selected = cat.id === selectedCatId
  const icon = useMemo(() => makeCatIcon(cat, selected, index, tags), [cat, selected, index, tags])

  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      opacity={selectedCatId && !selected ? 0.55 : 1}
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{ click: () => onSelectCat(cat) }}
    />
  )
}
```

- [ ] **Step 3: Build `lat`/`lng` into both `points` construction paths, and run the result through `separateOverlappingCats`**

Replace the `points` `useMemo` in `CatMap`:

```tsx
const points = useMemo<MapPoint[]>(() => {
  const raw: MapPoint[] = !clusterViewport
    ? cats.map((cat): MapPoint => ({ type: 'single', cat, lat: cat.lat, lng: cat.lng }))
    : getMapPoints(clusterIndex, clusterViewport.bounds, clusterViewport.zoom)
  return separateOverlappingCats(raw)
}, [cats, clusterIndex, clusterViewport])
```

- [ ] **Step 4: Pass `lat`/`lng` through when rendering `CatMarker`**

In the `points.map(...)` render block, update the `CatMarker` usage:

```tsx
{
  points.map((point, index) =>
    point.type === 'single' ? (
      <CatMarker
        key={point.cat.id}
        cat={point.cat}
        lat={point.lat}
        lng={point.lng}
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
  )
}
```

(The `ClusterMarker` branch is unchanged — shown here only for context so the diff is unambiguous.)

- [ ] **Step 5: Type-check and lint**

```bash
npm run type-check
npm run lint
```

Expected: both pass with no errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/map/components/cat-map.tsx"
git commit -m "feat(map): render nudged pin positions for overlapping cats"
```

---

### Task 4: Manual browser verification

**Files:** none (manual QA pass, no code changes)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Tag two cats at the exact same location**

Log in, open the `/tag` flow, and tag two different cats (different photos/names), using the location-picker map both times — tap the exact same point on the picker at the same zoom level both times so the two cats land at identical or near-identical (<1m) coordinates.

- [ ] **Step 3: Verify on `/map`**

Navigate to `/map`, pan/zoom to the tagged location, and zoom in past the point where clusters break apart into individual pins (zoom > 16).

Expected:

- Both cats' pins are visible as two distinct, non-overlapping circles (not stacked on top of each other).
- Each pin is independently tappable — tapping one selects only that cat (confirm via the selected-state enlarged icon + name pill).
- Zooming in further increases the visual separation between the two pins.

- [ ] **Step 4: Regression check on normal (non-overlapping) pins**

Pan to an area with cats that are _not_ at duplicate coordinates.

Expected: those pins render exactly as before — correct position, staleness opacity, welfare badges, bounce-in animation, selection behavior all unaffected.

- [ ] **Step 5: Stop the dev server**

```
Ctrl+C
```

No commit for this task — it's a verification pass, not a code change.

---

### Task 5: Finish the branch

**Files:** none

- [ ] **Step 1: Final full check**

```bash
npm run format:check
npm run lint
npm run type-check
npm run build
```

Expected: all pass.

- [ ] **Step 2: Push and open a PR**

```bash
git push -u origin feat/map-nudge-overlapping-pins
gh pr create --title "feat(map): separate overlapping map pins" --body "$(cat <<'EOF'
## Summary
- Cats at identical/near-identical (<1m) coordinates were rendering as pins stacked perfectly on top of each other, un-separable by zooming.
- Adds `offsetLatLng` (lib/geo.ts) and `separateOverlappingCats` (lib/clustering.ts) to fan out all but the first pin in an overlapping group by a real 2m radius, so separation grows naturally as the map zooms in.
- No change to stored coordinates, `nearby_cats`, or distance calculations — purely a rendering-layer fix in cat-map.tsx.

## Test plan
- [x] `lib/geo.selfcheck.mts` and `lib/clustering.selfcheck.mts` pass via `node --experimental-strip-types`
- [x] Manual verification: two cats tagged at the same spot render as separate, independently tappable pins past the clustering cutoff
- [x] Manual regression check: non-overlapping pins unaffected
EOF
)"
```

---

## What this plan does NOT do

- Does not add a test framework — the two pure functions get self-checks, per the spec's Verification section.
- Does not touch `page.tsx`, the `nearby_cats` RPC, or any data-fetching.
- Does not change cluster-bubble rendering or behavior.
