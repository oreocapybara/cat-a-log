# Catch Sequence — Saving UX Redesign

## Problem

The `/tag/flush` page currently shows a bare `Loader2` spinner and "Saving {name}…" text while uploading the photo and registering the cat. This creates two problems:

1. **Feels slow** — the user has no sense of progress during what can be several seconds of network activity.
2. **Jarring transition** — the polished, rich tag flow drops to a blank screen with a spinner, breaking visual continuity.

## Solution

Replace the spinner with a **staged "catch sequence"** — a full-screen page that keeps the cat's photo visible, shows a smooth progress bar advancing through three labeled stages, and auto-navigates to `/tag/complete` when done.

The stages are timed rather than tied to real upload percentages. Each stage has a minimum display time so it always feels smooth and predictable. The real async operations run in parallel; a stage won't advance until both its timer and its real operation have completed.

## Layout

Centered full-screen, no navigation chrome:

- **Cat photo** — ~200×200, rounded-lg, border + shadow, fades/scales in on mount
- **Cat name** — bold heading below the photo
- **Stage label** — single line of muted text, crossfades between stages
- **Progress bar** — horizontal, rounded, `bg-primary` fill on `bg-muted` track, below the label

No back button, no other interactive elements. The page is a passive wait screen that auto-advances.

## Timing State Machine

| Stage | Label                 | Bar target | Min time | Real operation                   |
| ----- | --------------------- | ---------- | -------- | -------------------------------- |
| 1     | "Uploading photo…"    | 60%        | 1.5s     | Photo upload to Supabase storage |
| 2     | "Registering {name}…" | 90%        | 1.5s     | `POST /api/catch-cat`            |
| 3     | "Got 'em! 🐾"         | 100%       | 1.0s     | None (cosmetic hold)             |

### Advancement logic

A stage advances when **both** conditions are met:

1. The minimum timer for that stage has elapsed.
2. The real async operation for that stage has resolved successfully.

If the real operation finishes before the timer, the bar completes its smooth animation to the target and then advances. If the operation takes longer than the minimum time, the bar pauses at a "not-quite-done" value (e.g., 55% instead of 60%) and resumes once the operation completes — this prevents the bar from sitting at a round milestone looking frozen.

### Pause behavior

When an operation takes longer than its stage's minimum time:

- The bar animates to `target - 5%` over the min time (e.g., 55% over 1.5s for stage 1).
- It holds there until the operation resolves.
- On resolve, it animates the final 5% to the target (short 300ms transition), then advances.

This ensures the bar is always visibly moving when the operation completes — never stuck at a number.

## Animations

| Element      | Animation                                          | Timing                                               |
| ------------ | -------------------------------------------------- | ---------------------------------------------------- |
| Photo        | `animate-in fade-in zoom-in-95` (existing utility) | On mount, 300ms                                      |
| Progress bar | `transition: width` with `ease-in-out`             | Duration matches stage min time (1.5s / 1.5s / 1.0s) |
| Stage label  | Opacity crossfade                                  | 200ms on stage change                                |
| Page exit    | Fade-out (opacity 1→0)                             | 300ms, after stage 3 hold, before `router.replace`   |

All animations respect `motion-safe:` — users with `prefers-reduced-motion` get instant state changes with no transitions.

## Error Handling

If the photo upload or API call fails:

- Progress bar stops at its current position.
- Stage label changes to the error message (e.g., "Upload failed — check your connection").
- A "Try again" button appears below the progress bar.
- "Try again" resets the state machine to stage 1 and re-attempts the failed operation (and any subsequent ones). The pending tag data and photo object URL remain in component state — no need to re-read from IndexedDB.
- A "Discard" link appears below "Try again" — clears pending tag and navigates to `/map`.

No toast is shown — the error is communicated inline on the same page.

## Implementation Scope

### Changes

- **Rewrite** `app/(auth)/tag/flush/page.tsx` — replace spinner with the catch sequence UI and state machine.

### No changes

- `lib/pending-tag.ts` — same `readPendingTag()` / `clearPendingTag()` API
- `app/(auth)/tag/save/page.tsx` — same auth gate
- `app/(auth)/tag/complete/page.tsx` — same catch card destination
- `/api/catch-cat` route handler — same API
- Navigation flow: details → save → flush → complete (unchanged)

### New components

None. The state machine logic lives in the flush page file. If the file grows beyond ~150 lines during implementation, extract a `useCatchSequence` hook for the timer/operation coordination logic.

## Testing

- **Manual:** Verify stages animate smoothly on mobile viewport. Verify error state shows retry button. Verify `prefers-reduced-motion` disables animations.
- **E2E (if applicable):** Mock Supabase upload and `/api/catch-cat` to resolve instantly; verify all three stages still display for their minimum times before navigation occurs.
- **Unit-testable logic:** The "advance when both timer AND operation are done" predicate — can be extracted into a pure function or tested via the hook if extracted.

## Dark Mode

Works naturally — photo has `border-border`, progress bar uses `bg-primary` on `bg-muted`, text uses `text-foreground` / `text-muted-foreground`. No special dark-mode overrides needed.
