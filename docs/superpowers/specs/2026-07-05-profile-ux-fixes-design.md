# Profile UX Fixes — Design Spec

Three surgical fixes to the profile page and map preview card: card spacing, tag safety, and light-mode share dropdown.

## 1. Two-Zone Cat List Card Layout

### Problem

The `MyCatsList` card uses `<Card className="flex-row items-center gap-3 p-3">`. The Card component's built-in `py-(--card-spacing)` (16px) conflicts with the `p-3` (12px) override, causing uneven vertical padding. The tag pills, metadata, and action icons all compete for horizontal space in a single row.

### Solution

Replace the single-row layout with a two-zone card:

```
┌─────────────────────────────────────────────┐
│ [photo] [name + meta]         [⭐] [♡/🗑] │  ← Row 1: identity
├─────────────────────────────────────────────┤
│ [needs_medical] [possible_rabies] [deceased]│  ← Row 2: tag pills
└─────────────────────────────────────────────┘
```

### Specifics

- Use `data-size="sm"` on Card (sets `--card-spacing` to 12px cleanly) instead of fighting the built-in padding with a `p-3` override.
- **Row 1 (identity):** `flex-row items-center gap-3 px-3` — photo (h-14 w-14), text block (name + spotted/clock meta), star icon, release icon. Action icons are `self-start`.
- **Row 2 (tags):** `flex flex-wrap gap-1 px-3 pb-3` — full card width for tag pills. Only renders if the owner is viewing (tags are interactive) or if there are active/resolved tags to display.
- No explicit divider between rows — the padding break provides visual separation.

### Files affected

- `app/(app)/profile/[username]/components/my-cats-list.tsx`

---

## 2. Tag Undo Pattern

### Problem

Welfare tag buttons (`needs_medical`, `possible_rabies`, `deceased`) are tiny touch targets that trigger immediately on tap with no recovery path. On mobile, accidental taps are common and consequences are visible to the community (a false "needs medical" flag alarms other users).

### Solution

Severity-proportional friction:

- **`needs_medical` / `possible_rabies`:** Optimistic action + 5-second undo toast.
- **`deceased`:** Inline confirmation before committing (no undo toast — confirmation is the gate).

### Adding a tag (medical/rabies)

1. User taps inactive pill.
2. Pill immediately goes active (optimistic UI).
3. Sonner toast appears at bottom-center: `"Tagged: Needs medical" [Undo]` — 5s auto-dismiss.
4. If user taps "Undo" within 5s: optimistic rollback + hard delete the `cat_tags` row.
5. If undo window expires: action is committed (already written to DB optimistically).
6. Only one tag-undo toast visible at a time — use a stable Sonner toast ID (e.g. `"tag-undo"`) so calling `toast()` again auto-dismisses the previous one.
7. **Race condition:** If undo is tapped before the insert DB call resolves, the undo handler should await the insert's promise (or track a ref to it) before issuing the delete. If the insert hasn't completed yet, cancel it conceptually by setting a `cancelled` flag and deleting once the insert response arrives.

### Resolving a tag (medical/rabies)

1. User taps active pill.
2. Pill immediately changes to resolved style (gray "✓ Recovered" / "✓ Cleared").
3. Toast: `"✓ Recovered" [Undo]` or `"✓ Cleared" [Undo]` — 5s.
4. Undo restores the active state and reverts the `resolved_at` / `resolved_by` DB update.

### Adding `deceased` (inline confirmation)

1. User taps inactive "Passed away" pill.
2. Tag row content is replaced with an inline confirmation block:
   - Text: "Mark as passed away?"
   - Subtext: "Grays out this cat for the community."
   - Buttons: `[Confirm]` `[Cancel]`
3. Styled with `bg-muted`, rounded, same size as the tag row. Gentle `animate-in slide-in-from-top-1`.
4. No red, no warning icons — gravity is in the words.
5. On confirm: optimistic insert, no undo toast.
6. On cancel: tag row returns to normal.

### Removing `deceased`

Stays as-is: tap removes with a hard delete. Only the person who added it can do this within the grace period.

### Toast copy reference

| Action                  | Toast text                      | Button |
| ----------------------- | ------------------------------- | ------ |
| Add needs_medical       | `Tagged: Needs medical`         | Undo   |
| Add possible_rabies     | `Tagged: Possible rabies`       | Undo   |
| Resolve needs_medical   | `✓ Recovered`                   | Undo   |
| Resolve possible_rabies | `✓ Cleared`                     | Undo   |
| Undo fails (network)    | `Couldn't undo — already saved` | —      |

### Map preview card

- Same undo-toast pattern for resolving `needs_medical` / `possible_rabies` (tap the ✓ pill → optimistic resolve → toast with undo).
- The map card does not allow adding tags — it only shows active tags with a resolve action for medical/rabies.
- `deceased` on the map card is display-only (no resolve button). Same as current behavior.

### Files affected

- `app/(app)/profile/[username]/components/my-cats-list.tsx`
- `app/(app)/map/components/cat-preview-card.tsx`

---

## 3. Light Mode Share Dropdown Background

### Problem

The share dropdown (`ShareProfileButton`) uses `bg-popover` which resolves to `#ffffff` in light mode. The page background is `#fff7ed` (warm cream). The stark white dropdown looks like a cold flat rectangle on the warm page — it doesn't feel like it belongs.

### Solution

Tint the share dropdown's background warm to match the page, and rely on border + shadow for definition:

- Replace `bg-popover` with `bg-background` on the dropdown container. In light mode this becomes `#fff7ed` (same warmth as the page). In dark mode, `bg-background` is `#1c2534` which is close to `bg-popover` (`#232e42`) — still fine, the shadow does the separation work.
- Keep the existing `border shadow-lg` for elevation. The border (`#f2dfc8` light / `#34435c` dark) provides enough edge definition.
- Text color stays `text-popover-foreground` (matches in both themes).

### Files affected

- `app/(app)/profile/[username]/components/share-profile-button.tsx`

---

## Out of scope

- Redesigning the non-owner cat list view (uses `<a>` tags instead of Card).
- Full light-mode audit of other profile page components.
- Adding tag interactions to the map card (currently resolve-only, stays that way).
- Changes to the OG share image generation (`/api/profile-card/[username]/route.tsx`).
