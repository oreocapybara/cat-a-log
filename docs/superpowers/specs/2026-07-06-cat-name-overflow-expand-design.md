# Cat Name Overflow — Tap-to-Expand Design

## Problem

On the profile cat list (`my-cats-list.tsx`), cat names that exceed the available horizontal space are truncated with an ellipsis via the `truncate` CSS class. Users have no way to reveal the full name. This is especially common on mobile (the `max-w-sm` layout) where the name competes with a 56px photo thumbnail and two icon buttons for horizontal space. Cat names can be up to 50 characters.

## Solution

Add a tap-to-toggle expand/collapse interaction on cat names that overflow their container, with a chevron icon as a visual affordance.

## Behavior

1. **Default (collapsed):** Name renders in a single line with `truncate` (ellipsis) — identical to today's behavior.
2. **Overflow indicator:** When the name text actually overflows its container, a `ChevronDown` icon (Lucide, 12px, `text-muted-foreground`) appears inline immediately after the name.
3. **Tap to expand:** Tapping the name + chevron area removes `truncate` and applies `break-words`, allowing the name to wrap onto multiple lines. The row height grows naturally. The chevron flips to `ChevronUp`.
4. **Tap to collapse:** Tapping again re-applies `truncate` and reverts the chevron to `ChevronDown`.
5. **Short names (no overflow):** No chevron is shown, no tap behavior is attached. The name renders as static text — unchanged from today.

## Overflow Detection

- A callback ref is attached to each cat name text element, building a `Map<catId, HTMLElement>`.
- A `ResizeObserver` watches each name element. On resize (and on initial mount), it compares `scrollWidth > clientWidth` to determine overflow.
- An `overflowingNames: Set<string>` state tracks which cat IDs have overflowing names.
- Overflow is only re-measured when the name is in its collapsed state. While expanded, the "is overflowing" flag is preserved from the last collapsed measurement so the chevron remains visible for re-collapsing.

## Interaction Area & Accessibility

- When the name overflows, the name text + chevron is wrapped in a `<button>` element (unstyled, full width of the text area). This provides:
  - Proper tap target for mobile
  - Keyboard focusable + activatable via Enter/Space
  - `aria-expanded="true|false"` attribute
  - `aria-label`: "Show full name, {cat name}" when collapsed; "Collapse name, {cat name}" when expanded
- When the name does not overflow, the text renders as a plain `<p>` — no button, no role, no interactivity.

## Visual Details

- Chevron icon: `ChevronDown` / `ChevronUp` from `lucide-react`, 12px (`h-3 w-3`), `text-muted-foreground`, `ml-1` spacing, `shrink-0`.
- Expanded text: `whitespace-normal break-words` replaces `truncate`.
- No animation on expand/collapse — instant class swap for responsiveness.
- The button wrapper has no visible styling (no background, no border) beyond the default text styles. It should inherit `text-left` alignment.

## Scope

- **Single file change:** `app/(app)/profile/[username]/components/my-cats-list.tsx`
- **New state:** `expandedNames: Set<string>` — set of cat IDs currently expanded
- **New state:** `overflowingNames: Set<string>` — set of cat IDs whose names overflow
- **New refs:** `nameRefs` map via callback refs
- **New effect:** `ResizeObserver` setup/teardown for overflow detection
- **New imports:** `ChevronDown`, `ChevronUp` from `lucide-react`; `useEffect`, `useCallback` (already imported: `useState`, `useRef`)
- **No new dependencies**

## Edge Cases

- **"Unnamed cat" fallback:** This string is short and unlikely to overflow. If it somehow does on an extremely narrow viewport, the expand behavior still works correctly.
- **Cat list re-render (tag change, release, etc.):** The `overflowingNames` set is recalculated via ResizeObserver, so additions/removals from the list are handled automatically.
- **Server-side rendering:** `ResizeObserver` only runs client-side. On SSR, no chevrons render (names appear truncated without indicator until hydration). This is acceptable since overflow detection requires DOM measurement.
