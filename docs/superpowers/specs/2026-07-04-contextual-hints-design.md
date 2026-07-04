# Contextual Hints — Design

## Goal

Teach first-time users the app's two core gestures — tap a pin to see a cat, tap the FAB to tag one — without a tutorial or walkthrough. Hints are anchored coach marks that appear only when relevant, and clear themselves the moment the user performs the action they teach.

Scope is deliberately limited to `/map`: the pin hint and the Tag FAB hint. No hints for search, filters, profile, or voting in this pass.

---

## Coach marks

### Pin hint

Copy: **"Tap a pin to see this cat's story."**

Anchored to the nearest loaded cat marker. `nearby_cats` doesn't return rows pre-sorted by distance, so this means the marker with the lowest `distance_km` among the loaded set (a one-line `reduce`/`min`, not a re-sort) — not simply the first array entry. Eligible only once at least one cat marker is loaded on the user's map. If no cats ever load nearby, this hint is skipped entirely — there is nothing to point at, and a hint with no target teaches nothing.

Cleared permanently the first time the user opens any preview card (taps any pin), not just the anchored one.

### Tag hint

Copy: **"Tap here to tag a stray cat you've found."**

Anchored to the Tag FAB, pointed at from below (bubble sits above the FAB, connector pointing down to it).

Cleared permanently the first time the user enters `/tag`, regardless of whether they complete the flow.

### Sequencing

Both hints are one-shot: no dismiss button, no auto-hide timer, no re-showing. "Seen" is derived entirely from having used the feature.

If both are eligible on the same `/map` load (pins already nearby, neither hint seen yet), only the **pin hint** renders. The Tag hint waits for a later `/map` load, after the pin hint has cleared. This priority reflects the app's existing philosophy (browse before you're asked to contribute) and keeps the mobile screen from showing two coach marks at once.

This suppression decision needs to know both "are there cats loaded" and "has each hint been seen" — both are known where the map's cat data already lives, so the decision is made in one place (the map page's client component), not split across `BottomNav` and the map.

---

## Persistence

Two `localStorage` booleans, read/written directly with `getItem`/`setItem` — no generic "hints system," no versioning, no expiry:

- `hasSeenPinHint`
- `hasSeenTagHint`

Per-device, not profile-linked. Guests are unauthenticated when they first see these (per the guest-tag-flow design), so there is no account to attach the flag to yet; and even after signing up, a "have you seen this tooltip" flag has no reason to follow a user across devices.

---

## Implementation

### Pin hint — `cat-map.tsx`

Uses react-leaflet's existing `<Tooltip permanent direction="top">`, rendered as a child of the `<Marker>` with the lowest `distance_km`, conditional on `!hasSeenPinHint`. Leaflet already repositions tooltips through pan/zoom — no custom coordinate math, no new dependency (react-leaflet is already installed).

### Tag hint — `app/(app)/map/components/tag-fab-hint.tsx`

A small `fixed`-position bubble, positioned with the same fixed coordinates `bottom-nav.tsx` already uses for the nav pill (`inset-x-4 bottom-4`), rendered above it. The FAB's position is constant across every page it appears on, so this needs no ref or portal into `BottomNav` — just matching CSS coordinates.

Rendered from the map page (not from `BottomNav`) specifically so the suppression logic in the previous section — which needs the cat count — stays colocated with the pin hint's logic, instead of being split between the map page and the shared `(app)` layout.

### Setting the flags

- `hasSeenPinHint` — set the first time a preview card is opened (existing `setSelectedCatId` call site in the map page's client component).
- `hasSeenTagHint` — set on mount of `app/(app)/tag/page.tsx`.

Both are one-line `localStorage.setItem(key, '1')` calls at existing state-change points — no new event system.

---

## Files

| File                                               | Change                                                                                                                                   |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(app)/map/components/tag-fab-hint.tsx`        | New — fixed-position bubble pointing at the FAB                                                                                          |
| `app/(app)/map/components/cat-map.tsx`             | Add conditional `<Tooltip permanent direction="top">` on the nearest loaded marker (lowest `distance_km`)                                |
| `app/(app)/map/page.tsx` (or its client component) | Read `hasSeenPinHint`/`hasSeenTagHint`; compute suppression; set `hasSeenPinHint` at the existing pin-tap handler; render `<TagFabHint>` |
| `app/(app)/tag/page.tsx`                           | Set `hasSeenTagHint` on mount                                                                                                            |

---

## Verification

1. First-time guest with no cats loaded nearby: no pin hint appears; Tag hint appears (pointing at the FAB).
2. First-time guest with cats loaded nearby: pin hint appears, anchored to the nearest marker; Tag hint does not appear on this load.
3. Tapping any pin's preview card clears the pin hint permanently (`localStorage.hasSeenPinHint` set); reloading `/map` shows the Tag hint instead (if not already seen).
4. Entering `/tag` (from the FAB or otherwise) clears the Tag hint permanently; reloading `/map` shows neither hint (once both flags are set).
5. A returning user who has already seen both hints never sees either again, even after clearing cats/re-visiting with new pins nearby.
6. Pin hint tooltip stays anchored to its marker through map pan and zoom.
7. No hint ever appears on `/tag`, `/profile/me`, or other routes outside `/map`.
