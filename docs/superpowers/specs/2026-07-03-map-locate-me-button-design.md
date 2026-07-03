# "Go to My Location" Button — Design

## Goal

Add a location button to the map screen, Google Maps-style: tap to center on your current position, tap again to enter continuous "follow me" tracking, tap again (or manually drag the map) to stop.

## Behavior — 3 states, 2 visual styles

- **`idle`** → tap: one-shot `getCurrentPosition`, map flies there, becomes `centered`. Neutral glass style (matches the filter button).
- **`centered`** → tap: starts `watchPosition`, map re-centers live as the position updates, becomes `following`.
- **`following`** → tap: `clearWatch`, back to `idle`. Visual: solid primary-orange fill + a pulsing ring (new `pulse-ring-primary` keyframe, alongside the existing blue user-dot and red medical-badge pulses already in `globals.css` — kept as its own keyframe rather than parameterizing one shared keyframe, matching how the other two are already written separately).
- **Manual drag while `following`** → stops tracking, back to `idle`. Detected via Leaflet's `dragstart` event, which only fires on real user-initiated drag (not on our own programmatic `flyTo` calls), so there's no ambiguity between "the map moved because we recentered it" and "the user grabbed the map."
- Any geolocation failure (`getCurrentPosition` or `watchPosition` error callback) → `toast.error(...)` (existing convention) and reset to `idle`, clearing any active watch.

## Placement/visibility

Bottom-right (`absolute right-4 bottom-28`), floating above the bottom nav. Hidden entirely while the cat preview card is open (`!selectedCat`) — the preview card is full-width, so a bottom-right button would otherwise sometimes sit underneath it.

## Components

- **`locate-button.tsx`** (new) — presentational only: `{ mode, visible, onClick }`. No geolocation logic of its own.
- **`cat-map.tsx`** — the "you are here" marker is currently drawn at the `center` prop, which is mount-only and never updates (this is why nothing currently moves the blue dot). Add a separate `userLocation: [number, number]` prop for the marker's live position, decoupled from `center`. Also add a `dragstart` handler to the existing `MapEvents` internal component, surfaced as a new `onUserDrag` callback prop.
- **`page.tsx`** — owns `locationMode` state, a `watchIdRef` for the active `watchPosition` subscription, and a `userLocation` state that both the marker and (via the existing `flyToTarget` state, already built for the cat-search feature) the map's programmatic panning read from. Reuses `flyToTarget`/`FlyTo` as-is rather than adding a second panning mechanism.

## Explicitly out of scope

- No special-cased "instant pan" vs "animated fly" distinction for continuous tracking updates — reusing the existing `flyTo`/`FlyTo` mechanism as-is. If rapid `watchPosition` updates make the animation feel like it's fighting itself in practice, that's a fast-follow, not blocking this pass.
- No distinct visual for `centered` vs `idle` — only `following` gets a distinct look, since `centered` is a transient state on the way to a decision (follow or not).

## Testing / verification

No test framework in this repo. Manual/browser verification: tap cycle through idle → centered → following → idle, confirm the marker and map both move on each `watchPosition` update (can be simulated via `page.evaluate` overriding `navigator.geolocation` in a headless browser, or via Chrome DevTools' geolocation override), confirm dragging the map while following exits to idle, confirm the button hides when a cat is selected, and confirm a geolocation error surfaces a toast and resets state.
