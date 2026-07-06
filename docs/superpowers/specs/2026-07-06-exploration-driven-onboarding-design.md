# Exploration-Driven Onboarding — Design

## Problem

The current onboarding uses a sequential waterfall: a WelcomeSheet appears first, then coach marks are gated behind each other (pin → tag → filter → avatar → share). A user who wants to explore freely — going straight to profile or tapping the filter before a pin — never sees later hints because they haven't "obeyed" earlier ones. The tutorial punishes exploration.

## Goal

Replace the obedient-sequential model with context-triggered hints. Each hint appears independently when the user first encounters its feature, regardless of what they've done elsewhere. The user is free to explore in any order.

## Design decisions

1. **Context-triggered, not waterfall-gated.** Each page owns its own hints. No page's hints depend on actions taken on another page.
2. **Once-only.** A hint is cleared permanently the first time the user performs the action it teaches. No retry, no re-showing.
3. **One hint per screen at a time.** Within a single page, at most one hint renders. Priority is decided locally by the page (most fundamental action first). Different pages show hints independently of each other.
4. **Remove the WelcomeSheet.** The map with its pins is the welcome. The pin hint handles the affordance gap ("these are tappable"). A separate interstitial card adds friction without teaching anything the contextual hints don't already cover.

## Architecture

No new abstractions. The existing `useSeenFlag` hook and `CoachMark` component are the right primitives. The fix is removing the one piece that created the sequential feeling: the WelcomeSheet interstitial.

### Map page (`/map`)

Three hints, one shown at a time, local priority:

| Priority | Hint         | Trigger              | Cleared by                |
| -------- | ------------ | -------------------- | ------------------------- |
| 1        | Pin hint     | ≥1 cat marker loaded | Tapping any pin           |
| 2        | Tag FAB hint | Always eligible      | Entering `/tag`           |
| 3        | Filter hint  | Always eligible      | Tapping the filter button |

Priority logic (existing code, unchanged):

```ts
const activeMapHint =
  !hasSeenPinHint && nearestCat
    ? 'pin'
    : !hasSeenTagHint
      ? 'tag'
      : !hasSeenFilterHint
        ? 'filter'
        : null
```

If no cats are nearby, the pin hint is skipped and the tag FAB hint shows instead.

### Profile page (`/profile/me`)

Two hints, one shown at a time, owner-only:

| Priority | Hint        | Trigger             | Cleared by            |
| -------- | ----------- | ------------------- | --------------------- |
| 1        | Avatar hint | Viewing own profile | Tapping avatar/camera |
| 2        | Share hint  | Viewing own profile | Tapping share button  |

Priority logic (existing code, unchanged):

```ts
const showAvatarHint = isOwner && !hasSeenAvatarHint
const showShareHint = isOwner && hasSeenAvatarHint && !hasSeenShareHint
```

These never appear when viewing another user's profile.

### Independence between pages

A new user who navigates directly to `/profile/me` without ever tapping a map pin will see the avatar hint immediately. A user who explores the filter before tapping a pin will see the filter hint next time they visit `/map` (after the pin hint clears). No action on one page blocks hints on another.

## Persistence

Five `localStorage` booleans remain:

- `hasSeenPinHint`
- `hasSeenTagHint`
- `hasSeenFilterHint`
- `hasSeenAvatarHint`
- `hasSeenShareHint`

The `hasSeenWelcome` key is no longer set or read. Existing values in returning users' localStorage are harmless orphans — no migration needed.

## Changes

| File                                                         | Action                                                     |
| ------------------------------------------------------------ | ---------------------------------------------------------- |
| `app/(app)/map/components/welcome-sheet.tsx`                 | **Delete**                                                 |
| `app/(app)/map/page.tsx`                                     | Remove `WelcomeSheet` import and `<WelcomeSheet />` render |
| `app/(app)/profile/[username]/components/profile-header.tsx` | No change (already page-local)                             |
| `app/(app)/tag/page.tsx`                                     | No change (already clears tag hint on mount)               |
| `app/(app)/map/components/tag-fab-hint.tsx`                  | No change                                                  |
| `app/(app)/map/components/filter-hint.tsx`                   | No change                                                  |
| `app/(app)/components/coach-mark.tsx`                        | No change                                                  |
| `lib/use-seen-flag.ts`                                       | No change                                                  |

## Verification

1. First-time user lands on `/map` with cats nearby → pin hint appears on nearest marker. No welcome sheet.
2. User ignores the pin hint, navigates to `/profile/me` → avatar hint appears immediately.
3. User returns to `/map`, taps a pin → pin hint clears. On next `/map` load, tag FAB hint shows.
4. User taps filter button directly (without ever entering `/tag`) → filter hint clears.
5. No two hints appear on the same screen simultaneously.
6. Returning users with existing flags set see no change in behavior — their dismissed hints stay dismissed.
