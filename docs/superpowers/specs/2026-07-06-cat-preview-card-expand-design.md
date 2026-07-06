# CatPreviewCard Expand/Collapse Design

## Problem

The `CatPreviewCard` on the map page hard-truncates the cat name to a single line and clamps notes to 2 lines. Users with long cat names or detailed descriptions have no way to read the full text without navigating away. This creates UX friction — the card is supposed to give quick context, but it actively hides content.

## Solution

Add an in-place expand/collapse interaction to the card. The card starts compact (as today, with slightly more generous text allowance) and expands when tapped to reveal full name and notes. No new dependencies — pure CSS transitions with Tailwind class toggling.

## Collapsed State (Default)

- **Name:** `line-clamp-2` (up from `truncate`/1-line today). Handles names up to ~50–60 characters without expansion.
- **Notes:** `line-clamp-2` (unchanged). Shows first ~2 lines of the description.
- **"More" indicator:** A small `text-muted-foreground text-[11px]` label ("…more") at the bottom-right of the text column. Only rendered when truncation is detected on either the name or notes.
- **Layout:** Unchanged horizontal layout — thumbnail (64×64) left, text column center, close button top-right.
- **Height:** Slightly taller than today (~20px) only when the name actually wraps to 2 lines. Short names still render on 1 line.

## Expanded State

- **Name:** `line-clamp` removed — full text wraps naturally with no limit.
- **Notes:** `line-clamp` removed — full notes visible (up to 500-char DB limit).
- **Max height:** `max-h-[50vh]`. Provides generous reading space while keeping the map visible above.
- **Overflow:** If content exceeds 50vh (unlikely but possible), the text column becomes scrollable via `overflow-y-auto`.
- **Collapse indicator:** A `ChevronDown` icon (`h-4 w-4`, `text-muted-foreground`) centered at the bottom of the card, inside padding. Only visible in expanded state.
- **Layout:** Stays horizontal — identical spatial arrangement to collapsed state. Only height changes.

## Transition

- Property: `max-height`
- Duration: `duration-200` (matches existing card enter/exit animation timing)
- Easing: `ease-out`
- Direction: Card grows upward (bottom-anchored at `bottom-24`)

## Interaction Model

### Tap targets

| Element                              | Action                          |
| ------------------------------------ | ------------------------------- |
| Card body (text, chips, empty space) | Toggle expand/collapse          |
| Thumbnail button                     | Opens gallery modal (unchanged) |
| Close (X) button                     | Dismisses card (unchanged)      |
| Welfare tag resolve buttons          | Resolves the tag (unchanged)    |

### Behavioral rules

- **Auto-collapse on cat change:** When the user selects a different cat marker, the card resets to collapsed state for the new cat. Expand state does not persist across cats.
- **No expand when nothing is truncated:** If the name fits within 2 lines and notes fit within 2 lines, the card is not expandable. No "more" indicator appears, no tap-to-expand behavior is attached. The card behaves identically to today.
- **Close always dismisses:** The X button always fully closes the card, whether collapsed or expanded. It does not collapse first.

## Truncation Detection

Use a ref-based approach:

1. Attach refs to the name element and notes element.
2. After render (in a `useEffect` or `useLayoutEffect`), compare `scrollHeight > clientHeight` on each ref.
3. If either is truncated, set an `isTruncated` state flag to `true`.
4. Re-check on cat change and on window resize (names that fit at one width may truncate at another).
5. Only show the "more" indicator and enable tap-to-expand when `isTruncated` is true.

## Animation Coordination

The card already has enter/exit animations:

- Enter: `animate-in fade-in slide-in-from-bottom-2` (duration-200)
- Exit: `animate-out fade-out slide-out-to-bottom-2` (duration-200)

The expand/collapse `max-height` transition is independent — it only applies while the card is mounted and visible. No conflict:

- Card appears → collapsed (enter animation plays)
- User taps → expand transition plays (max-height grows)
- User taps again → collapse transition plays (max-height shrinks)
- User taps X → exit animation plays (from whatever current state)

## Component Changes

All changes are within `app/(app)/map/components/cat-preview-card.tsx`:

1. Add `expanded` boolean state (default `false`)
2. Add `isTruncated` boolean state (default `false`)
3. Add refs for name and notes elements
4. Add truncation detection effect
5. Change name from `truncate` → `line-clamp-2` (collapsed) / no clamp (expanded)
6. Keep notes at `line-clamp-2` (collapsed) / no clamp (expanded)
7. Add "…more" indicator (conditional on `isTruncated && !expanded`)
8. Add `ChevronDown` collapse indicator (conditional on `expanded`)
9. Add `max-h-[50vh]` to the card element and `overflow-y-auto` to the text column (the `min-w-0 flex-1` div) when expanded — thumbnail and close button remain fixed, only text scrolls if it exceeds the cap
10. Add `onClick` handler on the card body that toggles `expanded` (with `stopPropagation` exclusions for thumbnail/close/resolve)
11. Reset `expanded` to `false` when `cat` identity changes
12. Add `transition-[max-height] duration-200 ease-out` to the card

## Files Modified

- `app/(app)/map/components/cat-preview-card.tsx` — sole file affected
