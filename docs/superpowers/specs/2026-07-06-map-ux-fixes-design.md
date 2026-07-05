# Map & Tag UX Fixes — Design Spec

**Date:** 2026-07-06
**Scope:** Three small, independent UX improvements to the map and tag flows.

---

## 1. Re-search Pill — Show on Any Pan/Zoom

### Problem

The "Search this area" pill only appears when no already-loaded cats are within the new viewport bounds. In practice, a small pan that keeps even one loaded cat visible never triggers the pill — making it nearly impossible to refresh results for the current view.

### Solution

Remove the `stillCovered` guard in `handleMoveEnd`. Set `searchStale = true` on every `moveend` event (the existing `firstMoveEndRef` mount-skip guard remains).

### Behavior

1. User lands on map → initial fetch → pill hidden.
2. User pans or zooms → pill appears immediately after gesture settles.
3. User taps pill → fetch fires, pill hides, results update.
4. User pans again → pill reappears.

Programmatic `flyTo` (e.g. after selecting a search result or tapping locate) also fires `moveend`, so the pill will reappear. This is acceptable — users may want fresh data at the new view. A suppress flag can be added as a future refinement if it feels noisy.

### Changes

| File                     | Change                                                                                                                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(app)/map/page.tsx` | Remove the `stillCovered` const and the conditional `setSearchStale(!stillCovered)`. Replace with unconditional `setSearchStale(true)`. Remove the `distanceKm` import (only usage is this check). |

---

## 2. Locate Button — Optimistic Pulse + Deferred Spinner

### Problem

Tapping the locate button calls `getCurrentPosition()` — a 1–3 second async operation — with no visual feedback. The button appears unresponsive on press, especially on mobile.

### Solution

Add a `'locating'` mode with immediate CSS pulse feedback and a 300ms-deferred spinner icon swap.

### State Machine

```
idle → (tap) → locating → (success < 300ms) → centered (no spinner shown)
                        → (success ≥ 300ms) → centered (spinner was shown, clears)
                        → (error)           → idle (toast shown)

centered → (tap) → following
following → (tap) → idle
```

### Behavior

1. User taps locate → button pulses immediately (same `map-locate-pulse` class used for following mode).
2. If GPS resolves within 300ms → map flies to location, button transitions to `centered`. No spinner was ever shown.
3. If GPS takes longer than 300ms → icon swaps from `<LocateFixed>` to `<Loader2 className="animate-spin">` while still pulsing.
4. On GPS success → map flies, button transitions to `centered`, icon returns to `<LocateFixed>`.
5. On GPS error → toast error, button returns to `idle`, pulse stops.

### Changes

| File                                         | Change                                                                                                                                                                                                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(app)/map/components/locate-button.tsx` | Add `'locating'` to `LocationMode` union. When `mode === 'locating'`: apply `map-locate-pulse` class. Internal `useEffect` starts a 300ms timeout; on expiry, set local `showSpinner` state to swap the icon. Reset when mode changes away from `'locating'`. |
| `app/(app)/map/page.tsx`                     | In `handleLocateClick` (idle branch): call `setLocationMode('locating')` before `getCurrentPosition`. On success callback: set location + flyTo + `setLocationMode('centered')`. On error callback: toast + `setLocationMode('idle')`.                        |

### Visibility

The locate button continues to hide when a cat preview card is open (`visible={!selectedCat}`). This is intentional — it reduces clutter in the focused-card state. The responsiveness fix addresses the "swipe lag" perception; if the visibility behavior is still problematic after this fix, it can be revisited separately.

---

## 3. Gallery Upload — Remove `capture` Attribute

### Problem

The photo input in the tag flow uses `capture="environment"`, which forces the camera to open directly on mobile browsers. Users cannot select an existing photo from their gallery.

### Solution

Remove the `capture="environment"` attribute from the file input. The OS native picker then presents both camera and gallery options.

### Platform Behavior

| Platform               | Behavior after fix                                                          |
| ---------------------- | --------------------------------------------------------------------------- |
| **iOS Safari (14.5+)** | Shows native action sheet: "Take Photo" / "Photo Library" / "Browse"        |
| **Android Chrome**     | Shows system picker with camera and gallery options                         |
| **Desktop**            | Opens standard file picker (unchanged from current behavior with `capture`) |

### Behavior

1. User taps photo area → OS native picker appears.
2. User chooses camera → takes photo → returns to app → image editor opens.
3. User chooses gallery → picks existing photo → returns to app → image editor opens.
4. Rest of the tag flow (editor → location → continue) is unchanged.

### Changes

| File                                        | Change                                                                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(app)/tag/components/photo-screen.tsx` | Remove `capture="environment"` from the `<input>` element. Update subtitle text from `"Tap to open camera"` to `"Tap to open camera or gallery"`. |

---

## Testing Checklist

- [ ] **Re-search pill:** Pan map slightly (one loaded cat still visible) → pill appears. Tap → refetch. Verify pill hides during fetch, reappears on next pan.
- [ ] **Locate button (fast GPS):** Tap locate → button pulses immediately → map flies within 300ms → no spinner shown → button shows centered state.
- [ ] **Locate button (slow GPS):** Simulate slow geolocation → button pulses → after 300ms spinner appears → on resolve spinner clears, map flies.
- [ ] **Locate button (error):** Deny geolocation permission → button pulses → error toast → button returns to idle.
- [ ] **Gallery upload (iOS Safari):** Tap photo area → action sheet with Camera/Photo Library/Browse appears. Select gallery → photo loads into editor.
- [ ] **Gallery upload (Android Chrome):** Tap photo area → system picker with camera + gallery options. Select gallery → photo loads into editor.

---

## Out of Scope

- Debouncing or threshold logic for the re-search pill
- Keeping the locate button visible when a cat card is open
- Adding a separate "Take photo" button alongside the gallery option
- Any changes to the image editor or location picker flows
