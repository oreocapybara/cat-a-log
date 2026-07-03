# Day 3 — Live Map Integration — Design

## Goal

Replace the static `/map` visual shell (built during the app-wide visual redesign) with a functional map: real cat markers from the database, a working "search this area" refresh, and a working filter (TNR status + welfare tags). This is the Day 3 milestone referenced in `AGENTS.md`'s "Pages still to be built".

## Existing building blocks (no new dependencies)

- `leaflet` + `react-leaflet` are already installed and already used in `app/(app)/tag/components/location-picker-map.tsx` (OpenStreetMap tiles, no API key, dynamically imported with `ssr: false`).
- `nearby_cats(lat, lng, radius_km)` — existing Supabase RPC, returns `NearbyCat[]` (includes `distance_km`, `is_ear_tipped`) — already called client-side in `candidates-screen.tsx` via `supabase.rpc(...)`.
- Geolocation pattern already exists in `photo-screen.tsx`: a `LocationState` discriminated union (`loading | success | error`) driven by `navigator.geolocation.getCurrentPosition({ enableHighAccuracy: true })`, with a retry action on error.
- `@base-ui/react` is already installed and already used for `components/ui/checkbox.tsx`, `button.tsx`, `input.tsx` — provides a `Dialog` primitive for the new filter sheet, so no new UI dependency is needed.
- Cat photo rendering already uses a plain `<img>` with an `eslint-disable-next-line @next/next/no-img-element` comment (`candidates-screen.tsx`) rather than `next/image` — no remote image domains are configured in `next.config.ts`.

## Architecture

`app/(app)/map/page.tsx` becomes a Client Component (`'use client'`), orchestrating state the way `app/(app)/tag/page.tsx` orchestrates the tag flow. New files:

- `app/(app)/map/components/cat-map.tsx` — Leaflet `MapContainer`, cat markers, user-location marker, exposes a callback for "map has settled after a pan/zoom". Dynamically imported from `page.tsx` with `ssr: false`, mirroring `LocationPickerMap`'s import in `photo-screen.tsx`.
- `app/(app)/map/components/cat-preview-card.tsx` — bottom card for the selected cat (real data, replacing the current mock "Mochi" card).
- `app/(app)/map/components/filter-sheet.tsx` — ear-tipped toggle + tag checkboxes, opened from the existing filter button.
- `components/ui/dialog.tsx` (new cross-cutting primitive) — thin wrapper around `@base-ui/react/dialog`, following the same pattern as `checkbox.tsx`. Used as the filter sheet's base (a bottom-anchored dialog, not a full modal).

## Data flow

1. On mount, resolve geolocation using the same `LocationState` pattern as `photo-screen.tsx`. No coordinates → no map render; show an inline "Location unavailable — tap to retry" state.
2. Once coordinates resolve, center the map there and fire an initial `nearby_cats` call with a fixed 2km radius (no map viewport exists yet to derive a radius from).
3. After any user pan/zoom settles (Leaflet `moveend`), the search pill switches from static text to an active "Search this area" button — no auto-refresh on every pan/zoom (avoids query spam and matches the existing pill affordance).
4. Tapping the pill re-queries `nearby_cats`, centered on the map's current center, with `radius_km = center.distanceTo(bounds.getNorthEast())` converted from meters to km (Leaflet's built-in `LatLng.distanceTo`, no new dependency).
5. For the returned cat IDs, a second query (`supabase.from('cat_tags').select('cat_id, tag').in('cat_id', ids)`) fetches welfare tags to build a `Map<cat_id, tag[]>` for filtering. The `nearby_cats` RPC is not modified.
6. Filter state (ear-tipped boolean + selected tag set) is applied client-side against the fetched cats to decide which render as markers. No filters selected = show all fetched cats.
7. Cat markers use a small `L.divIcon` rendering a filled `primary`-orange dot (pure CSS, no image asset) — visually distinct from the blue pin `LocationPickerMap` uses in the tag flow, since that pin represents "the location you're placing" and this dot represents "a cat here."
8. Tapping a marker sets `selectedCatId` in `page.tsx` state, rendering `CatPreviewCard` with the real `name` (fallback "Unnamed cat"), `primary_photo_url`, `distance_km`, ear-tipped badge, and any welfare tag badges.

## Filter UI

`filter-sheet.tsx` is a bottom-anchored dialog (built on the new `components/ui/dialog.tsx`) containing:

- A `Checkbox` + label: "TNR'd (ear-tipped) only"
- Three `Checkbox` rows, one per tag: `needs_medical`, `possible_rabies`, `deceased`
- Selected tags use OR semantics ("show cats with any selected tag"), ANDed with the ear-tipped toggle if also set
- Applying the filter closes the sheet and re-renders markers from the already-fetched cat set (no new network call — filtering is client-side against data already in memory)

## Error handling

- Geolocation denied/unavailable: inline retry state, no map rendered (matches `photo-screen.tsx`'s existing UX for the same failure).
- `nearby_cats` or `cat_tags` fetch failure: `toast.error(...)`, consistent with `candidates-screen.tsx`; markers simply don't update on that attempt.
- Zero results after a search or after filtering: the pill/card area shows "No cats found nearby" instead of an empty map with no feedback.

## Explicitly out of scope

- Modifying the `nearby_cats` SQL function or adding a new migration — filtering by tags is done client-side against a second query, not pushed into the RPC.
- Marker clustering — not needed at this scale; can be revisited if real usage shows marker overlap becoming a problem.
- Any cat detail page / navigation target when tapping a marker beyond the existing preview card — no such page exists yet in this app.
- Changing the "add a cat" entry point — the bottom-nav FAB remains the only way to start the tag flow, unchanged from the visual-redesign shell.

## Testing / verification

No test framework exists in this repo. Verification:

1. `npm run type-check`, `npm run lint`, `npm run build` — existing CI gates.
2. Manual walkthrough at 375px width: grant location permission (map centers, initial 2km results load) → deny location and use the retry button → pan/zoom the map and tap "search this area" (radius matches the new viewport, pill returns to idle) → toggle each filter combination (ear-tipped only, each tag, combinations, then clear) → tap a marker to open the preview card with real data → tap a marker, then pan away, confirm card behavior is sane → test a location with zero nearby cats.
