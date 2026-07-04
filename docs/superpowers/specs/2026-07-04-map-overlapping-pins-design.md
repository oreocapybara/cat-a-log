# Separating Overlapping Map Pins — Design

## Goal

Two cats at the exact same (or near-identical) coordinates render as individual pins stacked perfectly on top of each other once zoom passes the clustering cutoff (`maxZoom: 16` in `lib/clustering.ts`). Since the pins are geographically identical, no amount of further zooming ever separates them — there's no way to tap one without the other. Nudge duplicate-position pins to a nearby-but-distinct coordinate so they visually fan apart and become individually tappable/zoomable.

---

## Detection

Two `single`-type map points are considered "overlapping" if the great-circle distance between them is **under 1 meter** (covers exact GPS duplicates and near-duplicate GPS jitter alike). Grouping runs only over the `single` points already produced by `getMapPoints()` for the current viewport — `cluster` points are untouched, since a cluster bubble already communicates "more than one cat here" via its photo stack + count badge.

Grouping is a simple O(n²) scan (pick an ungrouped point, collect every other ungrouped point within 1m of it, repeat). Viewport point counts are small (dozens, not thousands), so no spatial index is needed here beyond what `supercluster` already provides upstream.

## Nudge

For each group of 2+ overlapping points:

- The **first** point in the group keeps its true coordinates — this is the anchor.
- Every other point in the group fans out around the anchor at a fixed **2 meter** radius, evenly spaced by angle (`2π * i / groupSize`), so 2 cats end up opposite each other, 3 form a triangle, etc.
- The offset is a real geographic distance (via a new `offsetLatLng` helper in `lib/geo.ts`, same flat-earth approximation `distanceKm` already uses: 111 km/degree latitude, longitude scaled by `cos(lat)`), not a screen-pixel hack. This means separation is invisible when zoomed out and grows naturally larger (in screen pixels) as the user zooms in — solving "stuck together no matter how far you zoom."

The underlying `cat` object (`cat.lat`/`cat.lng`) is never mutated — it stays the source of truth for distance calculations, previews, share links, etc. Only the rendered marker position shifts.

---

## Components changed

### `lib/geo.ts`

Add:

```ts
export function offsetLatLng(
  lat: number,
  lng: number,
  bearingRad: number,
  meters: number
): [number, number]
```

Inverse of the math `distanceKm` already does — moves a point `meters` along `bearingRad` (0 = north, clockwise) and returns the new `[lat, lng]`.

### `lib/clustering.ts`

- `MapPoint`'s `single` variant gains explicit `lat`/`lng` fields (the _render_ position), alongside the existing `cat` (the _true_ position stays on `cat.lat`/`cat.lng`):

  ```ts
  export type MapPoint =
    | { type: 'single'; cat: NearbyCat; lat: number; lng: number }
    | { type: 'cluster'; ... } // unchanged
  ```

  `getMapPoints()` sets `lat`/`lng` to `cat.lat`/`cat.lng` by default (no visual change until nudged).

- New export:

  ```ts
  export function separateOverlappingCats(points: MapPoint[]): MapPoint[]
  ```

  Groups `single` points within 1m (per Detection above), leaves each group's first member as-is, and rewrites `lat`/`lng` on the rest via `offsetLatLng` at a 2m radius fanned by angle. Points not part of any group (or `cluster` points) pass through unchanged.

### `app/(app)/map/components/cat-map.tsx`

- Both places `points: MapPoint[]` is built (the no-viewport-yet fallback and the `getMapPoints` call) now include `lat`/`lng` per single point.
- Wrap the final `points` in `separateOverlappingCats(...)` before rendering.
- `CatMarker` takes the render position from its point's `lat`/`lng` (passed as props) instead of reading `cat.lat`/`cat.lng` directly. `makeCatIcon` is unaffected — it never reads coordinates, only photo/name/tags.

No changes to `page.tsx`, the `nearby_cats` query, or anything outside the map's client-side rendering layer.

---

## What this feature does NOT do

- Does not change what coordinates are stored, searched, or used for distance/preview calculations — nudging is a rendering-only concern local to `cat-map.tsx`.
- Does not affect `cluster`-type points — clusters already visually communicate "multiple cats here."
- No configurable threshold/radius — fixed 1m detection, 2m fan radius, matching the fixed-defaults style `lib/clustering.ts` already uses for cluster `radius`/`maxZoom`.
- No transitive/union-find grouping — a point only joins the _first_ ungrouped point it's within 1m of. Fine for the realistic case (a handful of cats stacked at one exact spot); a pathological chain of points each 0.99m from the next but spanning meters overall is not worth the added complexity.

---

## Verification

No test framework in this repo (checked `package.json` — no jest/vitest configured). Rather than add one for two pure functions, leave a small assert-based self-check runnable via Node 22's native TypeScript support (`node --experimental-strip-types`), covering:

1. Two identical-coordinate points → separated by ~2m, first point unmoved.
2. Three stacked points → fanned 120° apart, all ~2m from the anchor.
3. Two distinct points >1m apart → untouched.

Plus manual verification in the browser: view the map with two cats tagged at the same coordinates, zoom in past the clustering cutoff, confirm both pins are visible and independently tappable, and confirm unrelated pins (single, non-overlapping) render exactly as before.
