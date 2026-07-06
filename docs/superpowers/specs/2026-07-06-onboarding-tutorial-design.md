# Onboarding Tutorial — Design

## Goal

Give first-time users just enough context to understand and use the app, without a blocking tutorial. Two pieces:

1. A one-sentence, non-blocking **welcome sheet** on first `/map` load — what the app is, for guests and signed-in users alike.
2. **Coach marks** — anchored, one-shot tooltips that teach a specific gesture the moment it's relevant, and disappear forever once the user performs that gesture.

Neither piece ever blocks interaction with the real app. Any tap on the real UI (a pin, the FAB, a filter icon) counts as understanding, not just an explicit "dismiss."

## Relationship to prior work

This supersedes the `/map`-only scope of `2026-07-04-contextual-hints-design.md`. That spec's pin hint and Tag FAB hint were designed but never implemented (no `hasSeenPinHint`/`hasSeenTagHint` code exists in the repo). This doc carries those two forward unchanged and adds three more coach marks (filter, avatar-edit, share-profile) plus the welcome sheet.

Match-voting is out of scope: `match_votes`/`match_vote_entries` exist only in the DB schema (`supabase/migrations/`, `lib/supabase/types.ts`); no UI reads or writes them yet, so there is nothing to anchor a hint to. Add a voting coach mark once that UI exists.

---

## 1. Welcome sheet

Copy: **"Cat-A-Log — Spot a stray? Tag it. See who's nearby on the map."** with a single "Got it" button.

- New file `app/(app)/map/components/welcome-sheet.tsx`. A `fixed` bottom sheet (`inset-x-4 bottom-4`, matching the FAB's existing fixed positioning), **not** a `Dialog` — no backdrop, no focus trap. The map behind it is fully interactive while it's showing.
- Rendered from `app/(app)/map/page.tsx`, gated on `!hasSeenWelcome`. Nothing about its presence delays the map's own data fetching or render.
- Dismissal, either of which sets the flag:
  - Tapping "Got it"
  - Any other interaction with the page's real UI (pin tap, FAB tap, search, filter icon, locate button) — first one wins
- Fires for guests too — `/map` is a public route (see `proxy.ts`), so most users' first encounter with the app has no account yet.
- Persistence: `localStorage.hasSeenWelcome`, set once, no expiry, no versioning. Per-device, matching the existing hint flags below — a "have you seen this" flag has no reason to follow a user across devices.

---

## 2. Coach marks

Same primitive as the original contextual-hints spec: an anchored tooltip, no dismiss button, no auto-hide timer, never re-shown. "Seen" is derived entirely from performing the taught action. No generic hints engine — each page computes its own small waterfall inline, since there are only two call sites (`/map`, `/profile/me`).

### `/map` waterfall (one hint shown per page load, in this priority order)

1. **Pin hint** — copy: "Tap a pin to see this cat's story." Anchored to the nearest loaded marker (lowest `distance_km` among loaded cats — a one-line `reduce`/`min`, not a re-sort). Skipped entirely if no cats are loaded nearby. Clears on first preview-card open (any pin, not just the anchored one).
2. **Tag FAB hint** — copy: "Tap here to tag a stray cat you've found." Anchored to the Tag FAB, bubble above it pointing down, same fixed coordinates as `BottomNav`'s pill. Clears on first entry to `/tag`.
3. **Filter hint** — copy: "Filter by ear-tip status or welfare tags." Anchored to the `SlidersHorizontal` icon button in the map's top bar (`app/(app)/map/page.tsx`, ~line 317). Clears on first `FilterSheet` open.

Priority reflects the core loop (browse, then tag) taking precedence over a power-user feature (filtering). If more than one hint is eligible on a given load, only the highest-priority one renders; the rest wait for a later load once the one above them has cleared.

### `/profile/me` waterfall (independent from `/map`'s; only when `isOwner`)

1. **Avatar-edit hint** — copy: "Add a profile photo." Anchored to the camera badge in `AvatarWithEdit` (`app/(app)/profile/[username]/components/profile-header.tsx`). Clears on opening the avatar upload dialog.
2. **Share-profile hint** — copy: "Share your profile." Anchored to `ShareProfileButton` (same directory). Clears on first open of its share dropdown.

Avatar before share: personalizing your own profile precedes wanting to share it. Both hints are gated on `isOwner` — a visitor viewing someone else's profile never sees them, since neither action is theirs to take.

### Persistence

Six flat `localStorage` booleans, read/written directly with `getItem`/`setItem`:

- `hasSeenWelcome`
- `hasSeenPinHint`
- `hasSeenTagHint`
- `hasSeenFilterHint`
- `hasSeenAvatarHint`
- `hasSeenShareHint`

No versioning, no expiry, no profile-linking — consistent with the original spec's reasoning (guests have no account yet when they first see these; even after signup, "have you seen this tooltip" has no reason to sync across devices).

---

## Implementation

| File                                                                                        | Change                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(app)/map/components/welcome-sheet.tsx`                                                | New — non-modal bottom sheet, dismiss-on-any-interaction                                                                                                                                                                                                               |
| `app/(app)/map/components/tag-fab-hint.tsx`                                                 | New — fixed-position bubble above the FAB                                                                                                                                                                                                                              |
| `app/(app)/map/components/filter-hint.tsx`                                                  | New — small anchored bubble near the filter icon button                                                                                                                                                                                                                |
| `app/(app)/map/components/cat-map.tsx`                                                      | Add conditional `<Tooltip permanent direction="top">` on the nearest loaded marker                                                                                                                                                                                     |
| `app/(app)/map/page.tsx`                                                                    | Read all `/map` hint flags; compute the 3-step waterfall; render `<WelcomeSheet>`, `<TagFabHint>`, `<FilterHint>`; set `hasSeenWelcome` on dismissal, `hasSeenPinHint` at the existing pin-tap handler, `hasSeenFilterHint` at the existing `FilterSheet`-open handler |
| `app/(app)/tag/page.tsx`                                                                    | Set `hasSeenTagHint` on mount                                                                                                                                                                                                                                          |
| `app/(app)/profile/[username]/components/profile-header.tsx` (or `AvatarWithEdit` directly) | Add avatar-edit hint bubble, conditional on `isOwner && !hasSeenAvatarHint`; set flag on dialog open                                                                                                                                                                   |
| `app/(app)/profile/[username]/components/share-profile-button.tsx`                          | Add share-profile hint bubble, conditional on `isOwner && !hasSeenShareHint`; set flag on dropdown open                                                                                                                                                                |

All flag writes are one-line `localStorage.setItem(key, '1')` calls at existing state-change points — no new event system.

---

## Verification

1. First-ever `/map` load (guest, no account): welcome sheet appears over a live, interactive map.
2. Tapping a pin while the welcome sheet is showing dismisses the sheet AND registers as the pin-hint-clearing action.
3. Guest with no cats loaded nearby: no pin hint; Tag FAB hint appears instead.
4. Guest with cats loaded nearby: pin hint appears anchored to the nearest marker; Tag FAB hint waits for a later load.
5. Opening any preview card clears the pin hint permanently; next load shows the Tag FAB hint (if unseen).
6. Entering `/tag` clears the Tag FAB hint permanently; next `/map` load shows the filter hint (if pin + Tag FAB both seen).
7. Opening the filter sheet clears the filter hint permanently; no more `/map` hints appear on subsequent loads.
8. On `/profile/me`: avatar-edit hint appears first for an owner who hasn't uploaded a photo; opening the avatar dialog clears it and reveals the share-profile hint on a later load.
9. Visiting someone else's `/profile/[username]` never shows the avatar or share hints, regardless of flags.
10. A returning user who has seen everything sees no sheet and no hints, even after clearing cats or revisiting with new pins nearby.
11. Pin hint tooltip stays anchored through map pan and zoom.
12. No `/map` hint ever appears on `/tag` or `/profile/me`, and no profile hint ever appears on `/map`.
