# Map Screen — Glass Redesign — Design

## Goal

Make the `/map` screen (built during the Day 3 live map integration) feel modern and engaging instead of functional-but-flat: theme-aware map tiles, a frosted-glass treatment on the overlay UI, and a small set of CSS-only motion touches. Purely visual/motion — no data, query, or component-boundary changes.

## Visual style — frosted glass, theme-aware

- **Map tiles**: swap the current raw OpenStreetMap `TileLayer` URL for CARTO's free basemap tiles (no API key, drop-in URL change, same `TileLayer` component): `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png` in light mode, `dark_all` in dark mode. Theme read via `useTheme()` from `next-themes` (already wired app-wide since the app-wide visual redesign). Attribution string gets `&copy; <a href="https://carto.com/attributions">CARTO</a>` appended alongside the existing OSM attribution, per CARTO's terms.
- **Overlay UI** (search pill, filter button, cat preview card): move from solid `bg-card` to a glass treatment — translucent background (`bg-card/70 dark:bg-card/50`), `backdrop-blur-md`, and a thin light border (`border-white/40 dark:border-white/10`) — replacing the current opaque `border-border bg-card` styling. Pure Tailwind v4 utilities (`backdrop-blur-*` is built in), no new dependency.
- **Cat markers**: keep the existing photo-circle (inactive, 44×44) / rounded-square-with-label (active, 64×64) shapes from the current implementation. Only the shadow/ring softens slightly (larger blur radius, lower opacity) so they read as floating above the glass rather than flat stickers. No shape or size changes beyond that.

## Motion (all CSS-only, no new dependency)

- **Marker pop-in**: a `bounceIn` keyframe (`scale(0)→scale(1.15)→scale(1)`, ~400ms, spring-ish easing) applied to each marker's inner `div`. Because react-leaflet remounts the icon's DOM node whenever the `icon` prop changes, this naturally replays on both initial mount and the inactive↔active swap — no extra state tracking needed.
- **Staggered entrance**: whenever `cats` (the full array from `fetchCats`) is replaced — initial load or "search this area" — each marker gets `animation-delay: min(index * 40ms, 400ms)` (capped so a large result set doesn't produce a multi-second cascade) set as an inline style alongside the existing per-marker `L.divIcon` html.
- **User location dot**: continuous `pulseRing` keyframe (expanding, fading `box-shadow` ring), always on — same visual language as the standard "you are here" dot on Google/Apple Maps.
- **Tile fade-in**: one small global CSS rule (`.leaflet-tile { opacity: 0; transition: opacity 200ms ease-out; } .leaflet-tile-loaded { opacity: 1; }`) so newly loaded tiles fade in while panning/zooming instead of popping.
- **Reduced motion**: all three keyframe animations (`bounceIn`, stagger delay, `pulseRing`) are wrapped so `prefers-reduced-motion: reduce` disables them (marker appears in its final state immediately, pulse ring becomes a static ring) — matches the precedent set in the app-wide visual redesign spec (`motion-safe:` / media-query gating).

## Files touched

- `app/globals.css` — new `@keyframes bounceIn`, `@keyframes pulseRing`, the `.leaflet-tile` fade-in rule, and a `prefers-reduced-motion` override block. Plain CSS (Tailwind v4's utility system doesn't need to know about these one-off animations).
- `app/(app)/map/components/cat-map.tsx` — `useTheme()` for tile URL selection, marker HTML updated to include the bounce animation class + per-index stagger delay, user-icon HTML gets the pulse ring, softened marker shadow values.
- `app/(app)/map/page.tsx` — glass classNames on the search pill and filter button (`Button`/plain `div` currently using `bg-card` + `border-border`).
- `app/(app)/map/components/cat-preview-card.tsx` — glass classNames on the `Card` root.

## Explicitly out of scope

- Marker clustering — not requested, separate concern from "feel modern," would need its own design pass.
- An animation library (Framer Motion, etc.) — CSS keyframes fully cover the agreed motion set.
- Visual changes to `filter-sheet.tsx` — not part of this round.
- Changing marker shape/size or the underlying `nearby_cats` data flow — this spec is presentation-only.

## Testing / verification

No test framework exists in this repo and this is a styling/motion-only change (no new business logic branches). Verification:

1. `npm run type-check`, `npm run lint`, `npm run build` — existing CI gates.
2. Manual walkthrough in the browser at mobile width, in both light and dark mode: confirm tile provider switches with theme, glass panels are legible over both light and dark tiles (contrast check), marker bounce plays on load and on tap-to-select, stagger cascade is visible but not sluggish on a "search this area" refresh, user-location pulse is visible and not distracting, tile fade-in doesn't look laggy while panning, and enabling OS-level "reduce motion" removes the bounce/stagger/pulse animations.
