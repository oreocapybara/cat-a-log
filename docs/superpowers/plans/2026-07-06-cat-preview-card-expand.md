# CatPreviewCard Expand/Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tap-to-expand/collapse behavior to the map's CatPreviewCard so long names and notes are readable without navigation.

**Architecture:** Single-component change. A boolean `expanded` state toggles Tailwind classes on the existing elements (line-clamp removal, max-height cap). Truncation is detected via ref-based `scrollHeight > clientHeight` comparison. CSS `max-height` transition handles the animation.

**Tech Stack:** React state + refs, Tailwind CSS v4 utility classes, Lucide icons (already in project)

## Global Constraints

- No new dependencies
- Single file change: `app/(app)/map/components/cat-preview-card.tsx`
- Must pass existing CI: `format:check`, `lint`, `type-check`, `build`
- Tailwind v4 (utility classes, no `@apply` in component files)
- Existing enter/exit animations must not break

---

### Task 1: Add expand/collapse state, truncation detection, and UI changes

**Files:**

- Modify: `app/(app)/map/components/cat-preview-card.tsx`

**Interfaces:**

- Consumes: Existing `CatPreviewCard` props (no changes to parent API)
- Produces: Same component with identical external interface; internal-only behavioral addition

- [ ] **Step 1: Add `ChevronDown` to the Lucide import**

Change the import on line 2 from:

```tsx
import { Check, Clock, Eye, Images, MapPin, Scissors, X } from 'lucide-react'
```

to:

```tsx
import { Check, ChevronDown, Clock, Eye, Images, MapPin, Scissors, X } from 'lucide-react'
```

- [ ] **Step 2: Add `expanded` and `isTruncated` state, and refs for name/notes**

After the existing `thumbnailRef` declaration (line 56), add:

```tsx
const [expanded, setExpanded] = useState(false)
const [isTruncated, setIsTruncated] = useState(false)
const nameRef = useRef<HTMLParagraphElement>(null)
const notesRef = useRef<HTMLParagraphElement>(null)
```

- [ ] **Step 3: Reset `expanded` when cat identity changes**

Inside the existing `if (cat !== prevCat)` block, within the `if (cat)` branch (after `setClosing(false)`), add:

```tsx
setExpanded(false)
```

- [ ] **Step 4: Add truncation detection effect**

After the existing `useEffect` for the closing timeout, add:

```tsx
useEffect(() => {
  function checkTruncation() {
    const nameEl = nameRef.current
    const notesEl = notesRef.current
    const nameTruncated = nameEl ? nameEl.scrollHeight > nameEl.clientHeight : false
    const notesTruncated = notesEl ? notesEl.scrollHeight > notesEl.clientHeight : false
    setIsTruncated(nameTruncated || notesTruncated)
  }

  checkTruncation()
  window.addEventListener('resize', checkTruncation)
  return () => window.removeEventListener('resize', checkTruncation)
}, [renderedCat])
```

- [ ] **Step 5: Add the card body click handler**

After the `handleResolve` function, add:

```tsx
function handleCardBodyClick(e: React.MouseEvent) {
  // Don't toggle if clicking interactive children (thumbnail, close, resolve buttons)
  if ((e.target as HTMLElement).closest('button, a')) return
  if (!isTruncated) return
  setExpanded((prev) => !prev)
}
```

- [ ] **Step 6: Apply `max-h-[50vh]` and transition classes to the Card element + attach click handler**

Update the `<Card>` element's `className` to add the max-height constraint and transition. Also add the `onClick` handler:

Change:

```tsx
<Card
  className={cn(
    'bg-card/70 dark:bg-card/90 absolute inset-x-4 bottom-24 z-10 flex-row items-center gap-3 p-3 shadow-lg ring-white/40 backdrop-blur-md duration-200 dark:ring-white/10',
    closing
      ? 'motion-safe:animate-out motion-safe:fade-out motion-safe:slide-out-to-bottom-2'
      : 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2'
  )}
>
```

to:

```tsx
<Card
  className={cn(
    'bg-card/70 dark:bg-card/90 absolute inset-x-4 bottom-24 z-10 max-h-[50vh] flex-row items-start gap-3 p-3 shadow-lg ring-white/40 backdrop-blur-md transition-[max-height] duration-200 ease-out dark:ring-white/10',
    closing
      ? 'motion-safe:animate-out motion-safe:fade-out motion-safe:slide-out-to-bottom-2'
      : 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2',
    isTruncated && !expanded && 'cursor-pointer'
  )}
  onClick={handleCardBodyClick}
>
```

Note: `items-center` → `items-start` so the thumbnail and close button stay top-aligned when the card grows. The `max-h-[50vh]` caps height in expanded state. The `transition-[max-height]` enables smooth animation (replacing the generic `duration-200` that was there before).

- [ ] **Step 7: Add `overflow-y-auto` to the text column div when expanded**

Change:

```tsx
<div className="min-w-0 flex-1 text-left">
```

to:

```tsx
<div className={cn('min-w-0 flex-1 text-left', expanded && 'overflow-y-auto')}>
```

- [ ] **Step 8: Update the name element — `truncate` → `line-clamp-2` with ref and conditional expansion**

Change:

```tsx
<p className="font-heading truncate text-base font-bold">{renderedCat.name ?? 'Unnamed cat'}</p>
```

to:

```tsx
<p ref={nameRef} className={cn('font-heading text-base font-bold', !expanded && 'line-clamp-2')}>
  {renderedCat.name ?? 'Unnamed cat'}
</p>
```

- [ ] **Step 9: Update the notes element — add ref and conditional line-clamp**

Change:

```tsx
<p className="text-muted-foreground border-border/60 mt-1.5 line-clamp-2 border-t pt-1.5 text-xs italic">
  "{renderedCat.notes}"
</p>
```

to:

```tsx
<p
  ref={notesRef}
  className={cn(
    'text-muted-foreground border-border/60 mt-1.5 border-t pt-1.5 text-xs italic',
    !expanded && 'line-clamp-2'
  )}
>
  "{renderedCat.notes}"
</p>
```

- [ ] **Step 10: Add "…more" indicator when collapsed and truncated**

After the notes `<p>` element (but still inside the text column `<div>`), add:

```tsx
{
  isTruncated && !expanded && (
    <span className="text-muted-foreground mt-1 block text-right text-[11px]">…more</span>
  )
}
```

- [ ] **Step 11: Add ChevronDown collapse indicator when expanded**

After the "…more" indicator (still inside the text column `<div>`), add:

```tsx
{
  expanded && (
    <div className="mt-2 flex justify-center">
      <ChevronDown className="text-muted-foreground h-4 w-4" />
    </div>
  )
}
```

- [ ] **Step 12: Run format, lint, and type-check**

Run:

```bash
npm run format
npm run lint
npm run type-check
```

Expected: All pass with no errors.

- [ ] **Step 13: Run build**

Run:

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 14: Manual smoke test**

Verify in the browser:

1. Open the map, tap a cat marker with a short name and no notes → card appears as before, no "…more" indicator, tapping card body does nothing
2. Tap a cat with a long name (>1 line) or long notes → "…more" indicator appears
3. Tap the card body → card expands, name/notes fully visible, ChevronDown appears at bottom
4. Tap again → card collapses back
5. While expanded, tap X → card dismisses (doesn't collapse first)
6. While expanded, tap a different marker → card resets to collapsed for new cat
7. Tap thumbnail → gallery opens (expand state unaffected)
8. Welfare resolve buttons still work

- [ ] **Step 15: Commit**

```bash
git add app/(app)/map/components/cat-preview-card.tsx
git commit -m "feat(map): add tap-to-expand on CatPreviewCard for long names/notes"
```
