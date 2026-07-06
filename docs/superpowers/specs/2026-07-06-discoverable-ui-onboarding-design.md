# Discoverable UI Onboarding — Design

## Problem

The coach mark system (5 tooltip callouts + a pin tooltip + the now-removed WelcomeSheet) narrates what the UI already communicates through standard affordances. Map pins, an orange elevated FAB with a `+` icon, a sliders filter icon, a camera badge on the avatar, and a share icon are all self-explanatory. The tooltips add visual noise, overlap with interactive elements (notably the cat preview card), and create friction by making the user feel they must follow a prescribed tutorial instead of exploring freely.

## Goal

Remove all coach marks and tooltip-based onboarding. Replace with two subtle, non-textual visual treatments that communicate through convention rather than instruction:

1. A one-time FAB pulse to draw peripheral attention on first visit.
2. A dashed-border avatar empty-state that communicates "incomplete" through visual pattern alone.

The app teaches itself through interaction. Zero text overlays. Zero friction.

## Design decisions

1. **No text, no overlays.** The UI's existing affordances are sufficient. Standard icons don't need labels on first use.
2. **FAB pulse** — CSS-only animation, localStorage-gated, respects `prefers-reduced-motion`. Draws peripheral vision while user orients to the map. Plays 3 times over ~4s, then never again.
3. **Avatar empty-state** — data-driven (not flag-driven). When `avatarUrl` is null and `isOwner`, the avatar renders as a dashed-outline circle instead of a solid fill. Resolves naturally when the user uploads a photo.
4. **Everything else is self-teaching.** Pins, filter, share — users discover through interaction. No hint needed.

---

## §1 Removals

### Components to delete

| File                                        | Reason                  |
| ------------------------------------------- | ----------------------- |
| `app/(app)/components/coach-mark.tsx`       | No longer used anywhere |
| `app/(app)/map/components/tag-fab-hint.tsx` | Replaced by FAB pulse   |
| `app/(app)/map/components/filter-hint.tsx`  | Removed entirely        |

### Logic to remove from existing files

| File                                                               | What to remove                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(app)/map/page.tsx`                                           | `useSeenFlag` imports/calls for pin/tag/filter; `activeMapHint` derivation; `nearestCat` memo; `pinHintCatId` prop on `<CatMap>`; hint conditional renders; `markPinHintSeen()` in `onSelectCat`; `markFilterHintSeen()` in filter button click |
| `app/(app)/map/components/cat-map.tsx`                             | `pinHintCatId` prop; `showPinHint` prop on `CatMarker`; `Tooltip` import from react-leaflet; `<Tooltip>` render inside `CatMarker`                                                                                                              |
| `app/(app)/tag/page.tsx`                                           | `useSeenFlag` import; the effect that calls `markTagHintSeen()` on mount                                                                                                                                                                        |
| `app/(app)/profile/[username]/components/profile-header.tsx`       | `useSeenFlag` imports/calls; `showAvatarHint`/`showShareHint` logic; `CoachMark` import and renders; `showHint`/`onOpen` props on `AvatarWithEdit`                                                                                              |
| `app/(app)/profile/[username]/components/share-profile-button.tsx` | `onOpen` prop                                                                                                                                                                                                                                   |
| `app/globals.css`                                                  | `.coach-mark-tooltip` and `.coach-mark-tooltip-top::before` rules                                                                                                                                                                               |

### localStorage keys eliminated

`hasSeenWelcome`, `hasSeenPinHint`, `hasSeenTagHint`, `hasSeenFilterHint`, `hasSeenAvatarHint`, `hasSeenShareHint` — all orphaned and no longer read.

---

## §2 FAB pulse

### Behavior

On the first `/map` visit (or any page showing `BottomNav`), the Tag FAB displays a radiating ring animation: a semi-transparent orange circle expanding outward from the button and fading out. Repeats 3 times (~4s total), then stops permanently.

### Trigger and persistence

- One localStorage key: `hasSeenFabPulse`
- On `BottomNav` mount: if flag is not set, render with `data-pulse` attribute
- After animation completes (CSS `animation-iteration-count: 3`) OR on first FAB click: set flag and remove attribute
- Respects `prefers-reduced-motion`: animation disabled entirely

### CSS implementation

In `app/globals.css`:

```css
@keyframes fab-pulse-ring {
  0% {
    transform: scale(1);
    opacity: 0.4;
  }
  100% {
    transform: scale(1.8);
    opacity: 0;
  }
}

[data-pulse]::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  background: var(--primary);
  animation: fab-pulse-ring 1.3s ease-out 3;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  [data-pulse]::before {
    animation: none;
    display: none;
  }
}
```

### JS implementation (in `BottomNav`)

- `useSeenFlag('hasSeenFabPulse')` returns `[seen, markSeen]`
- If `!seen`, add `data-pulse=""` to the FAB `<Link>`
- Listen for `animationend` on the FAB → call `markSeen()`
- On FAB click → call `markSeen()`

---

## §3 Avatar empty-state

### Behavior

When `avatarUrl` is null and `isOwner` is true, the avatar circle renders with a dashed border and muted text instead of a solid primary-color fill:

```
Before (solid fill):     bg-primary text-primary-foreground rounded-full
After (empty state):     border-2 border-dashed border-primary/40 text-muted-foreground rounded-full
```

The camera badge remains unchanged — it already communicates editability.

### No flag, no animation

This is purely conditional styling on existing data. When the user uploads a photo, `avatarUrl` becomes non-null, and the normal filled avatar renders. The empty-state disappears naturally.

### Non-owner profiles

No change. Viewing someone else's profile without a photo still shows the solid initials circle — the "incomplete" signal only makes sense for someone who can act on it.

---

## §4 Persistence

### Final localStorage state

| Key               | Purpose                                | Set by                                        | Cleared by        |
| ----------------- | -------------------------------------- | --------------------------------------------- | ----------------- |
| `hasSeenFabPulse` | Suppress FAB pulse after first session | `BottomNav` after animation ends or FAB click | Never (permanent) |

All other onboarding keys are orphaned. No migration or cleanup needed — they're harmless dead values.

### `useSeenFlag` hook

Kept. Used for the single FAB pulse flag. The hook is 15 lines and already handles the SSR hydration edge case (defaults to `true` until mounted to avoid flash).

---

## §5 What stays unchanged

- Map pins — tappable by convention, no affordance needed
- Filter button — standard sliders icon
- Share button — standard share icon
- `/tag` StepDots wizard — navigation within a flow, not onboarding
- Preview card — no overlap concerns since no coach marks exist

---

## §6 Verification

1. First-time user opens `/map` → FAB pulses 3 times, then stops. No tooltips, no overlays anywhere.
2. User taps a pin → preview card opens. No hint competes with it.
3. User navigates to `/profile/me` (no avatar uploaded) → dashed-border avatar circle with camera badge. No tooltip.
4. User uploads a photo → avatar becomes the normal filled circle with the photo.
5. User returns to `/map` → FAB does not pulse (flag already set).
6. With `prefers-reduced-motion: reduce` → no pulse animation at all.
7. Non-owner viewing a profile without a photo → solid initials circle (no dashed border).
