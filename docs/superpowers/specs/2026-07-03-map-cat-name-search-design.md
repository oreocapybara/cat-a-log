# Cat Name Search on the Map — Design

## Goal

The map screen's top bar looks like a search input but is actually just a "search this area" trigger in disguise — there's no way to type anything into it. This adds real text search for a specific cat by name, and relocates the area-refresh action elsewhere so the two behaviors stop being conflated.

## Interaction

- Default state of the top bar is unchanged: shows cat count / `Searching…` / `No cats found nearby`.
- Tapping it swaps in a real, auto-focused `<input placeholder="Search cats by name…">` with a cancel (✕) button in place of the filter button's row position (filter button itself stays put).
- Typing queries **all cats in the database by name** (`ilike`, case-insensitive substring), debounced ~300ms (plain `setTimeout` + cleanup, no new dependency) — not scoped to the currently-loaded nearby set, and not filtered by the welfare-tag filter sheet (name search is a distinct intent from browsing nearby with filters).
- Results render as a dropdown below the bar: photo thumbnail + name (+ distance from the user's current location, computed client-side with the haversine formula already conceptually mirrored server-side in `nearby_cats`). Capped at 10 results.
- Tapping a result:
  1. Calls the existing `fetchCats(lat, lng, INITIAL_RADIUS_KM)` centered on that cat's location (same function "search this area" already uses — just re-centered).
  2. Pans/zooms the map there.
  3. Sets `selectedCatId` to that cat, opening its preview card once the fetch resolves.
  4. Collapses the search bar back to display mode.
- No matches → an inline "No cats found" row in the dropdown, not a toast (it's a direct answer to the query, not a background event).
- Cancel (✕) clears the query and collapses back to display mode without changing the map.

## "Search this area" relocation

The bar can no longer double as this button once it's a real text input. It becomes a `sonner` toast (already used everywhere else in this app) with a "Search" action button, triggered by the same `moveend`-staleness logic that exists today. Uses a fixed toast `id` so repeated panning updates the same toast instead of stacking duplicates.

## Components

- **`app/(app)/map/components/search-bar.tsx`** (new) — self-contained: owns expanded/collapsed state, the debounced query, the Supabase query (`cats` table directly — its RLS policy is `SELECT USING (true)`, so no new RPC is needed), and the results dropdown UI. Takes an `onSelectCat(cat)` callback prop; doesn't know about map panning or fetching nearby cats itself.
- **`cat-map.tsx`** — gains a `flyTo: [number, number] | null` prop and an internal helper component (using react-leaflet's `useMap()` + `map.flyTo()`) so the map can be told to pan programmatically. `MapContainer`'s own `center` prop is only read once at mount, so this is a new capability, not a change to existing behavior.
- **`page.tsx`** — owns `flyToTarget` state, the `handleSelectSearchedCat` handler (fetch → set flyToTarget → set selectedCatId), and replaces the old inline "Search this area" `Button` branch with a `useEffect` that fires the toast whenever `searchStale` becomes true.

## Data flow

1. User types in `SearchBar` → debounced → `supabase.from('cats').select('id, name, primary_photo_url, lat, lng').ilike('name', `%${query}%`).limit(10)`.
2. Results shown in the dropdown as-is (no welfare tags fetched here — keeping the dropdown lightweight; tags load normally once the cat is actually selected via the existing `fetchCats` → `cat_tags` flow).
3. Selecting a result hands the chosen cat back to `page.tsx` via `onSelectCat`, which re-centers the whole existing nearby-fetch pipeline on that cat instead of the user's own location.

## Explicitly out of scope

- Searching by `notes`/description — name only, matching "search for a specific cat."
- Any change to the welfare-tag filter sheet.
- Ranking/sorting results by anything other than the database's default order (no relevance scoring).

## Testing / verification

No test framework in this repo. Manual verification: 0/1/many matching results, a match outside the current loaded radius (confirms fly-to + re-fetch), cancel button behavior, dark/light mode on the dropdown, and confirming the relocated toast still fires on pan and doesn't stack on repeated pans.
