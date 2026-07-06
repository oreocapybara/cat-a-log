# Cat Name Overflow Tap-to-Expand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tap-to-toggle expand/collapse on truncated cat names in the profile cat list, with a chevron indicator and proper accessibility.

**Architecture:** A single React component change. Overflow detection via `ResizeObserver` on name elements feeds a `Set<string>` of overflowing IDs. Overflowing names render inside a `<button>` with a chevron icon; tapping toggles between `truncate` and `whitespace-normal break-words` classes. Non-overflowing names stay as plain `<p>` elements.

**Tech Stack:** React (useState, useEffect, useCallback, useRef), Lucide React (ChevronDown, ChevronUp), Tailwind CSS, ResizeObserver API.

## Global Constraints

- No new dependencies — Lucide and Tailwind are already available
- Single file modification: `app/(app)/profile/[username]/components/my-cats-list.tsx`
- Mobile-first — this must work well on narrow viewports (`max-w-sm`)
- Accessibility: `aria-expanded`, meaningful `aria-label` including the cat's name

---

### Task 1: Add expand/collapse state and overflow detection

**Files:**

- Modify: `app/(app)/profile/[username]/components/my-cats-list.tsx`

**Interfaces:**

- Consumes: existing `cats` prop (array of `MyCat` with `id` and `name` fields)
- Produces: `expandedNames: Set<string>`, `overflowingNames: Set<string>`, `nameRefs` callback ref pattern — used by Task 2's JSX

- [ ] **Step 1: Add imports and state declarations**

At the top of `my-cats-list.tsx`, add `useEffect` and `useCallback` to the React import (they're not currently imported), and add `ChevronDown`, `ChevronUp` to the Lucide import:

```tsx
import { useState, useRef, useEffect, useCallback } from 'react'
```

```tsx
import { ChevronDown, ChevronUp, Clock, Eye, HandHeart, Star, Trash2 } from 'lucide-react'
```

Inside the `MyCatsList` component body, after the existing state declarations, add:

```tsx
const [expandedNames, setExpandedNames] = useState<Set<string>>(new Set())
const [overflowingNames, setOverflowingNames] = useState<Set<string>>(new Set())
const nameRefs = useRef<Map<string, HTMLElement>>(new Map())
```

- [ ] **Step 2: Add the callback ref function**

Below the new state declarations, add:

```tsx
const nameRefCallback = useCallback(
  (catId: string) => (el: HTMLElement | null) => {
    if (el) {
      nameRefs.current.set(catId, el)
    } else {
      nameRefs.current.delete(catId)
    }
  },
  []
)
```

- [ ] **Step 3: Add the ResizeObserver effect for overflow detection**

Below the callback ref, add:

```tsx
useEffect(() => {
  const observer = new ResizeObserver(() => {
    const newOverflowing = new Set<string>()
    for (const [catId, el] of nameRefs.current) {
      // Only measure when collapsed — expanded elements won't overflow
      if (!expandedNames.has(catId) && el.scrollWidth > el.clientWidth) {
        newOverflowing.add(catId)
      } else if (expandedNames.has(catId) && overflowingNames.has(catId)) {
        // Preserve the flag while expanded so the chevron stays visible
        newOverflowing.add(catId)
      }
    }
    setOverflowingNames((prev) => {
      // Avoid unnecessary re-renders if the set hasn't changed
      if (prev.size === newOverflowing.size && [...prev].every((id) => newOverflowing.has(id))) {
        return prev
      }
      return newOverflowing
    })
  })

  for (const el of nameRefs.current.values()) {
    observer.observe(el)
  }

  return () => observer.disconnect()
}, [cats, expandedNames, overflowingNames])
```

- [ ] **Step 4: Add the toggle handler**

Below the effect, add:

```tsx
function toggleNameExpanded(catId: string) {
  setExpandedNames((prev) => {
    const next = new Set(prev)
    if (next.has(catId)) {
      next.delete(catId)
    } else {
      next.add(catId)
    }
    return next
  })
}
```

- [ ] **Step 5: Verify the build compiles**

Run: `npm run type-check`
Expected: No errors (new state/refs/effect are valid but not yet used in JSX — unused vars may warn in lint but type-check should pass).

---

### Task 2: Update JSX to render expandable names with chevron

**Files:**

- Modify: `app/(app)/profile/[username]/components/my-cats-list.tsx`

**Interfaces:**

- Consumes: `expandedNames`, `overflowingNames`, `nameRefCallback`, `toggleNameExpanded` from Task 1
- Produces: Updated rendered output with accessible expand/collapse behavior

- [ ] **Step 1: Replace the name `<p>` element with conditional button/p rendering**

In the cat card's Row 1 section, find the existing name element:

```tsx
<p className="font-heading truncate text-base font-bold">{cat.name ?? 'Unnamed cat'}</p>
```

Replace it with:

```tsx
{
  overflowingNames.has(cat.id) ? (
    <button
      type="button"
      onClick={() => toggleNameExpanded(cat.id)}
      aria-expanded={expandedNames.has(cat.id)}
      aria-label={
        expandedNames.has(cat.id)
          ? `Collapse name, ${cat.name ?? 'Unnamed cat'}`
          : `Show full name, ${cat.name ?? 'Unnamed cat'}`
      }
      className="flex min-w-0 items-baseline gap-1 text-left"
    >
      <span
        ref={nameRefCallback(cat.id)}
        className={cn(
          'font-heading text-base font-bold',
          expandedNames.has(cat.id) ? 'break-words whitespace-normal' : 'truncate'
        )}
      >
        {cat.name ?? 'Unnamed cat'}
      </span>
      {expandedNames.has(cat.id) ? (
        <ChevronUp className="text-muted-foreground h-3 w-3 shrink-0" />
      ) : (
        <ChevronDown className="text-muted-foreground h-3 w-3 shrink-0" />
      )}
    </button>
  ) : (
    <p ref={nameRefCallback(cat.id)} className="font-heading truncate text-base font-bold">
      {cat.name ?? 'Unnamed cat'}
    </p>
  )
}
```

- [ ] **Step 2: Verify the build compiles and passes type-check**

Run: `npm run type-check`
Expected: PASS, no type errors.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS (no unused imports, no a11y violations).

- [ ] **Step 4: Run full build**

Run: `npm run build`
Expected: PASS — page compiles and bundles successfully.

- [ ] **Step 5: Manual verification**

Open the app at `/profile/me`. Verify:

1. Cat names that fit on one line: no chevron, no interactivity — looks unchanged.
2. Cat names that overflow: ellipsis shows with a small ˅ chevron after the text.
3. Tapping the name/chevron: name wraps to multiple lines, chevron becomes ˄.
4. Tapping again: collapses back to single-line truncated with ˅.
5. Keyboard: Tab to the button, press Enter — toggles correctly.

- [ ] **Step 6: Commit**

```bash
git add app/(app)/profile/[username]/components/my-cats-list.tsx
git commit -m "feat(profile): add tap-to-expand for truncated cat names"
```
