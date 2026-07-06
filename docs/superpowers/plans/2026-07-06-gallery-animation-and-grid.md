# Gallery Animation & Grid Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the gallery modal's generic zoom animation with origin-expansion from the thumbnail, redesign the bento grid to a 2-column adaptive layout, and add shimmer loading + micro-interactions.

**Architecture:** The gallery modal (`cat-gallery-modal.tsx`) will be rewritten to use CSS keyframe animations driven by CSS custom properties for dynamic origin rects. The parent (`cat-preview-card.tsx`) passes a ref to its thumbnail button so the gallery can compute the expansion origin. No new dependencies — pure CSS keyframes + `getBoundingClientRect()`.

**Tech Stack:** React 19, Base UI Dialog, CSS `@keyframes` with custom properties, Tailwind v4, `tw-animate-css`

## Global Constraints

- No new npm dependencies
- All motion gated behind `prefers-reduced-motion: reduce` (instant opacity swap fallback)
- Easing: `cubic-bezier(0.32, 0.72, 0, 1)` for all spatial transitions
- Must pass existing CI: format, lint, type-check, build
- Preserve existing lightbox scroll-snap paging and keyboard nav

---

### Task 1: CSS Keyframes & Utility Classes

**Files:**

- Modify: `app/globals.css`

**Interfaces:**

- Consumes: nothing (foundational CSS)
- Produces: `.gallery-expand`, `.gallery-contract`, `.gallery-tile-enter`, `.gallery-shimmer`, `.gallery-lightbox-expand`, `.gallery-lightbox-contract` classes consumed by Task 2 and Task 3

- [ ] **Step 1: Add gallery expansion keyframes to globals.css**

Append after the existing `/* Cluster bubble */` section, before the `@media (prefers-reduced-motion: reduce)` block:

```css
/* ── Gallery modal: origin-expansion animation ── */
@keyframes gallery-expand {
  from {
    top: var(--gallery-origin-y);
    left: var(--gallery-origin-x);
    width: var(--gallery-origin-w);
    height: var(--gallery-origin-h);
    border-radius: 12px;
    opacity: 0.8;
  }
  to {
    top: 16px;
    left: 16px;
    width: calc(100vw - 32px);
    height: calc(100dvh - 32px);
    border-radius: 24px;
    opacity: 1;
  }
}

@keyframes gallery-contract {
  from {
    top: 16px;
    left: 16px;
    width: calc(100vw - 32px);
    height: calc(100dvh - 32px);
    border-radius: 24px;
    opacity: 1;
  }
  to {
    top: var(--gallery-origin-y);
    left: var(--gallery-origin-x);
    width: var(--gallery-origin-w);
    height: var(--gallery-origin-h);
    border-radius: 12px;
    opacity: 0;
  }
}

.gallery-expanding {
  position: fixed;
  z-index: 60;
  overflow: hidden;
  animation: gallery-expand 350ms cubic-bezier(0.32, 0.72, 0, 1) forwards;
}

.gallery-contracting {
  position: fixed;
  z-index: 60;
  overflow: hidden;
  animation: gallery-contract 300ms cubic-bezier(0.32, 0.72, 0, 1) forwards;
}
```

- [ ] **Step 2: Add tile stagger entrance keyframes**

```css
@keyframes gallery-tile-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.gallery-tile-enter {
  opacity: 0;
  animation: gallery-tile-enter 200ms ease-out forwards;
}
```

- [ ] **Step 3: Add shimmer loading animation**

```css
@keyframes gallery-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.gallery-shimmer {
  background: linear-gradient(
    90deg,
    var(--muted) 25%,
    color-mix(in srgb, var(--muted-foreground) 8%, transparent) 50%,
    var(--muted) 75%
  );
  background-size: 200% 100%;
  animation: gallery-shimmer 1.5s ease-in-out infinite;
}
```

- [ ] **Step 4: Add lightbox tile-expansion keyframes**

```css
@keyframes gallery-lightbox-expand {
  from {
    top: var(--lb-origin-y);
    left: var(--lb-origin-x);
    width: var(--lb-origin-w);
    height: var(--lb-origin-h);
    border-radius: 12px;
  }
  to {
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 0;
  }
}

@keyframes gallery-lightbox-contract {
  from {
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 0;
  }
  to {
    top: var(--lb-origin-y);
    left: var(--lb-origin-x);
    width: var(--lb-origin-w);
    height: var(--lb-origin-h);
    border-radius: 12px;
  }
}

.gallery-lightbox-expanding {
  position: absolute;
  z-index: 10;
  overflow: hidden;
  animation: gallery-lightbox-expand 250ms cubic-bezier(0.32, 0.72, 0, 1) forwards;
}

.gallery-lightbox-contracting {
  position: absolute;
  z-index: 10;
  overflow: hidden;
  animation: gallery-lightbox-contract 250ms cubic-bezier(0.32, 0.72, 0, 1) forwards;
}
```

- [ ] **Step 5: Add reduced-motion overrides for gallery animations**

Inside the existing `@media (prefers-reduced-motion: reduce) { ... }` block, add:

```css
.gallery-expanding {
  animation: none;
  top: 16px;
  left: 16px;
  width: calc(100vw - 32px);
  height: calc(100dvh - 32px);
  border-radius: 24px;
  opacity: 1;
}
.gallery-contracting {
  animation: none;
  opacity: 0;
}
.gallery-tile-enter {
  animation: none;
  opacity: 1;
  transform: none;
}
.gallery-shimmer {
  animation: none;
}
.gallery-lightbox-expanding,
.gallery-lightbox-contracting {
  animation: none;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 0;
}
```

- [ ] **Step 6: Verify CSS parses correctly**

Run: `npm run build`
Expected: Build succeeds (CSS is valid, no syntax errors).

- [ ] **Step 7: Commit**

```bash
git add app/globals.css
git commit -m "feat(map): add gallery animation keyframes and shimmer CSS"
```

---

### Task 2: Pass Thumbnail Ref from Preview Card to Gallery

**Files:**

- Modify: `app/(app)/map/components/cat-preview-card.tsx`

**Interfaces:**

- Consumes: existing `CatGalleryModal` props
- Produces: `originRef` prop (`React.RefObject<HTMLButtonElement | null>`) passed to `CatGalleryModal`, used by Task 3

- [ ] **Step 1: Add ref and pass to gallery**

In `cat-preview-card.tsx`, add `useRef` to the import (currently only `useEffect, useState`), create a ref, attach it to the thumbnail `<button>` (the one with `aria-label="View photos of this cat"`), and pass it as `originRef` to `<CatGalleryModal>`:

```tsx
import { useEffect, useRef, useState } from 'react'

// Inside CatPreviewCard body:
const thumbnailRef = useRef<HTMLButtonElement>(null)

// On the thumbnail button:
<button
  ref={thumbnailRef}
  type="button"
  onClick={() => setGalleryOpen(true)}
  aria-label="View photos of this cat"
  className="block h-16 w-16 cursor-pointer overflow-hidden rounded-xl"
  style={{
    border: `3px solid ${frameColor}`,
    boxShadow: `0 0 0 3px ${frameColor}26`,
  }}
>

// Gallery usage:
<CatGalleryModal
  cat={renderedCat}
  open={galleryOpen}
  onOpenChange={setGalleryOpen}
  onViewLocation={handleViewLocation}
  originRef={thumbnailRef}
/>
```

- [ ] **Step 2: Commit (types resolve after Task 3 adds the prop)**

```bash
git add app/(app)/map/components/cat-preview-card.tsx
git commit -m "feat(map): pass thumbnail ref to gallery modal for origin animation"
```

---

### Task 3: Rewrite Gallery Modal — Origin Expansion + 2-Column Grid

**Files:**

- Rewrite: `app/(app)/map/components/cat-gallery-modal.tsx`

**Interfaces:**

- Consumes: `originRef` from Task 2, CSS classes from Task 1, `GalleryPhoto` type + `fetchGalleryPhotos` (kept from existing code), `NearbyCat` type from `@/lib/supabase/types`
- Produces: Fully functional `<CatGalleryModal>` with new props signature:

```tsx
export function CatGalleryModal(props: {
  cat: NearbyCat | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewLocation: (lat: number, lng: number) => void
  originRef: React.RefObject<HTMLButtonElement | null>
}): React.ReactNode
```

- [ ] **Step 1: Update component props to accept `originRef`**

Add `originRef` to the destructured props and type:

```tsx
export function CatGalleryModal({
  cat,
  open,
  onOpenChange,
  onViewLocation,
  originRef,
}: {
  cat: NearbyCat | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewLocation: (lat: number, lng: number) => void
  originRef: React.RefObject<HTMLButtonElement | null>
}) {
```

- [ ] **Step 2: Add animation state management**

Replace the simple `open` → render pattern with a state machine that tracks `idle | expanding | open | contracting`:

```tsx
const [phase, setPhase] = useState<'idle' | 'expanding' | 'open' | 'contracting'>('idle')
const [originRect, setOriginRect] = useState<DOMRect | null>(null)
const popupRef = useRef<HTMLDivElement>(null)

// Drive phase from open prop
useEffect(() => {
  if (open && phase === 'idle') {
    const rect = originRef.current?.getBoundingClientRect() ?? null
    setOriginRect(rect)
    setPhase('expanding')
  } else if (!open && (phase === 'open' || phase === 'expanding')) {
    // Re-capture rect for close (thumbnail may have moved if card re-rendered)
    const rect = originRef.current?.getBoundingClientRect() ?? null
    setOriginRect(rect)
    setPhase('contracting')
  }
}, [open])

// Transition: expanding → open
// Transition: contracting → idle
function handleAnimationEnd(e: React.AnimationEvent) {
  if (e.target !== popupRef.current) return
  if (phase === 'expanding') setPhase('open')
  if (phase === 'contracting') {
    setPhase('idle')
    setLightboxIndex(null)
  }
}

const isVisible = phase !== 'idle'
```

- [ ] **Step 3: Replace the Dialog render with custom animated container**

Instead of relying on Base UI's `data-[starting-style]` animations, render a portal manually when `isVisible` is true. The dialog still uses Base UI for focus trap and accessibility, but the popup's animation classes are ours:

```tsx
return (
  <DialogPrimitive.Root
    open={isVisible}
    onOpenChange={(next) => {
      if (!next) onOpenChange(false)
    }}
  >
    {isVisible && (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 z-[59] bg-black/70 transition-opacity duration-300',
            phase === 'contracting' ? 'opacity-0' : 'opacity-100'
          )}
        />
        <DialogPrimitive.Popup
          ref={popupRef}
          onAnimationEnd={handleAnimationEnd}
          className={cn(
            'bg-background flex flex-col shadow-2xl',
            phase === 'expanding' && 'gallery-expanding',
            phase === 'contracting' && 'gallery-contracting',
            phase === 'open' && 'fixed inset-4 z-[60] overflow-hidden rounded-3xl'
          )}
          style={
            {
              ...(originRect && {
                '--gallery-origin-x': `${originRect.left}px`,
                '--gallery-origin-y': `${originRect.top}px`,
                '--gallery-origin-w': `${originRect.width}px`,
                '--gallery-origin-h': `${originRect.height}px`,
              }),
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            } as React.CSSProperties
          }
        >
          {/* Header + grid content (see next steps) */}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    )}
  </DialogPrimitive.Root>
)
```

- [ ] **Step 4: Implement the 2-column adaptive grid layout**

Replace the old `bentoSpanClass` function and grid markup with the new rhythm logic:

```tsx
// Grid rhythm: hero (index 0) → pairs + wide tiles
// After hero: indices 1,2 = pair, 3 = wide, 4,5 = pair, 6 = wide, ...
function tileLayout(index: number, total: number): string {
  if (index === 0) {
    // Single photo gets taller hero
    if (total === 1) return 'col-span-2 aspect-[3/2]'
    return 'col-span-2 aspect-[2/1]'
  }
  // For 2 photos: second is full-width
  if (total === 2) return 'col-span-2 aspect-video'
  // Normal rhythm after hero: pair, pair, wide, pair, pair, wide...
  const pos = (index - 1) % 3
  if (pos === 2) return 'col-span-2 aspect-video'
  return 'aspect-square'
}
```

Grid container markup:

```tsx
<div className="grid grid-cols-2 gap-2 overflow-y-auto p-4 pt-2">
  {photos.map((photo, index) => (
    <button
      key={photo.id}
      ref={(el) => {
        tileRefs.current[index] = el
      }}
      type="button"
      onClick={() => openLightbox(index)}
      className={cn(
        'gallery-tile-enter relative overflow-hidden rounded-xl transition-[transform,filter] duration-100 ease-out active:scale-[0.96] active:brightness-[0.92]',
        tileLayout(index, photos.length)
      )}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <img src={photo.photoUrl} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-1.5">
        <p className="truncate text-[10px] font-semibold text-white">
          {formatSpottedDate(photo.spottedAt)}
        </p>
        {photo.spottedByUsername && (
          <Link
            href={`/profile/${photo.spottedByUsername}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-0.5 truncate text-[10px] text-white/80 transition-colors hover:text-white"
          >
            <User className="h-2.5 w-2.5 shrink-0" />@{photo.spottedByUsername}
          </Link>
        )}
      </div>
    </button>
  ))}
</div>
```

Note: `tileRefs` is a ref array for lightbox origin tracking:

```tsx
const tileRefs = useRef<(HTMLButtonElement | null)[]>([])
```

- [ ] **Step 5: Implement shimmer loading state**

Replace the `<Loader2>` spinner with skeleton placeholders that mirror the grid:

```tsx
{loading ? (
  <div className="grid grid-cols-2 gap-2 p-4 pt-2">
    <div className="gallery-shimmer col-span-2 aspect-[2/1] rounded-xl" />
    <div className="gallery-shimmer aspect-square rounded-xl" />
    <div className="gallery-shimmer aspect-square rounded-xl" />
  </div>
) : (
  /* grid from step 4 */
)}
```

- [ ] **Step 6: Implement empty state (single photo)**

When `photos.length === 1`, instead of rendering a lonely grid, show the hero with context text:

```tsx
{photos.length === 1 ? (
  <div className="flex flex-1 flex-col p-4 pt-2">
    <button
      type="button"
      ref={(el) => { tileRefs.current[0] = el }}
      onClick={() => openLightbox(0)}
      className="relative overflow-hidden rounded-xl transition-[transform,filter] duration-100 ease-out active:scale-[0.98] active:brightness-[0.92]"
    >
      <img
        src={photos[0].photoUrl}
        alt=""
        className="aspect-[3/2] w-full object-cover"
      />
    </button>
    <p className="text-muted-foreground mt-4 text-center text-sm">
      Only one sighting so far
    </p>
    <p className="text-muted-foreground mt-1 text-center text-xs">
      {formatSpottedDate(photos[0].spottedAt)}
      {photos[0].spottedByUsername && ` · @${photos[0].spottedByUsername}`}
    </p>
  </div>
) : (
  /* grid from step 4 */
)}
```

- [ ] **Step 7: Add scroll header blur effect**

Track whether the grid has scrolled past the top with an `IntersectionObserver`:

```tsx
const sentinelRef = useRef<HTMLDivElement>(null)
const [scrolled, setScrolled] = useState(false)

useEffect(() => {
  const sentinel = sentinelRef.current
  if (!sentinel) return
  const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), {
    threshold: 1,
  })
  observer.observe(sentinel)
  return () => observer.disconnect()
}, [photos])
```

Add a sentinel `<div ref={sentinelRef} className="h-0" />` as the first child of the scroll container. Update the header:

```tsx
<div className={cn(
  'flex shrink-0 items-center justify-between px-4 pt-4 pb-2 transition-[border-color,backdrop-filter] duration-150',
  scrolled && 'border-border/60 border-b backdrop-blur-sm'
)}>
```

- [ ] **Step 8: Verify full build passes**

Run: `npm run type-check && npm run build`
Expected: Both pass. The `originRef` prop added in Task 2 is now consumed here.

- [ ] **Step 9: Commit**

```bash
git add app/(app)/map/components/cat-gallery-modal.tsx
git commit -m "feat(map): rewrite gallery with origin-expansion animation and 2-col grid"
```

---

### Task 4: Lightbox Tile-Expansion Animation

**Files:**

- Modify: `app/(app)/map/components/cat-gallery-modal.tsx` (lightbox section)

**Interfaces:**

- Consumes: `tileRefs` array from Task 3, `.gallery-lightbox-expanding` / `.gallery-lightbox-contracting` classes from Task 1
- Produces: Animated lightbox that expands from the tapped tile and contracts back to it on close

- [ ] **Step 1: Add lightbox animation state**

Add state to track the lightbox phase and its origin rect:

```tsx
const [lbPhase, setLbPhase] = useState<'idle' | 'expanding' | 'open' | 'contracting'>('idle')
const [lbOriginRect, setLbOriginRect] = useState<DOMRect | null>(null)
const lbContainerRef = useRef<HTMLDivElement>(null)
```

- [ ] **Step 2: Update `openLightbox` to capture tile rect and start expansion**

```tsx
function openLightbox(index: number) {
  const tileEl = tileRefs.current[index]
  if (tileEl) {
    const gridEl = tileEl.closest('[data-gallery-grid]')
    const gridRect = gridEl?.getBoundingClientRect()
    const tileRect = tileEl.getBoundingClientRect()
    // Compute position relative to the gallery popup, not viewport
    const popupRect = popupRef.current?.getBoundingClientRect()
    if (popupRect) {
      setLbOriginRect(
        new DOMRect(
          tileRect.left - popupRect.left,
          tileRect.top - popupRect.top,
          tileRect.width,
          tileRect.height
        )
      )
    }
  }
  setLightboxIndex(index)
  setLbPhase('expanding')
  requestAnimationFrame(() => {
    scrollerRef.current?.scrollTo({ left: index * scrollerRef.current!.clientWidth })
  })
}
```

- [ ] **Step 3: Add lightbox close with reverse animation**

```tsx
function closeLightbox() {
  // Re-capture tile rect for return animation
  if (lightboxIndex !== null) {
    const tileEl = tileRefs.current[lightboxIndex]
    const popupRect = popupRef.current?.getBoundingClientRect()
    if (tileEl && popupRect) {
      const tileRect = tileEl.getBoundingClientRect()
      setLbOriginRect(
        new DOMRect(
          tileRect.left - popupRect.left,
          tileRect.top - popupRect.top,
          tileRect.width,
          tileRect.height
        )
      )
    }
  }
  setLbPhase('contracting')
}

function handleLbAnimationEnd(e: React.AnimationEvent) {
  if (e.target !== lbContainerRef.current) return
  if (lbPhase === 'expanding') setLbPhase('open')
  if (lbPhase === 'contracting') {
    setLbPhase('idle')
    setLightboxIndex(null)
  }
}
```

- [ ] **Step 4: Render lightbox with expansion animation**

Replace the existing lightbox `<div>` (the one with `absolute inset-0 z-10 flex flex-col bg-black`) with:

```tsx
{
  lbPhase !== 'idle' && lightboxIndex !== null && photos && (
    <div
      ref={lbContainerRef}
      onAnimationEnd={handleLbAnimationEnd}
      className={cn(
        'flex flex-col bg-black',
        lbPhase === 'expanding' && 'gallery-lightbox-expanding',
        lbPhase === 'contracting' && 'gallery-lightbox-contracting',
        lbPhase === 'open' && 'absolute inset-0 z-10'
      )}
      style={
        {
          ...(lbOriginRect && {
            '--lb-origin-x': `${lbOriginRect.x}px`,
            '--lb-origin-y': `${lbOriginRect.y}px`,
            '--lb-origin-w': `${lbOriginRect.width}px`,
            '--lb-origin-h': `${lbOriginRect.height}px`,
          }),
        } as React.CSSProperties
      }
    >
      {/* Header with counter and close button */}
      <div className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
        <span className="text-sm font-medium text-white/70">
          {lightboxIndex + 1} / {photos.length}
        </span>
        <button
          type="button"
          aria-label="Back to gallery"
          onClick={closeLightbox}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scroll-snap photo pager (unchanged) */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
      >
        {photos.map((photo) => (
          <img
            key={photo.id}
            src={photo.photoUrl}
            alt=""
            className="h-full w-full shrink-0 snap-center object-contain"
          />
        ))}
      </div>

      {/* Prev/Next buttons (unchanged) */}
      {lightboxIndex > 0 && (
        <button
          type="button"
          aria-label="Previous photo"
          onClick={() => scrollBy(-1)}
          className="absolute top-1/2 left-2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {lightboxIndex < photos.length - 1 && (
        <button
          type="button"
          aria-label="Next photo"
          onClick={() => scrollBy(1)}
          className="absolute top-1/2 right-2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Metadata bar */}
      {activePhoto && (
        <div className="shrink-0 px-4 pt-2 pb-4">
          <p className="text-sm font-semibold text-white">
            {formatSpottedDate(activePhoto.spottedAt)}
          </p>
          <div className="mt-1 flex items-center justify-between gap-2">
            {activePhoto.spottedByUsername ? (
              <Link
                href={`/profile/${activePhoto.spottedByUsername}`}
                className="flex items-center gap-1 text-xs text-white/70 transition-colors hover:text-white"
              >
                <User className="h-3 w-3 shrink-0" />@{activePhoto.spottedByUsername}
              </Link>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => onViewLocation(activePhoto.lat, activePhoto.lng)}
              className="flex cursor-pointer items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
            >
              <MapPin className="h-3.5 w-3.5" />
              View on map
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Update the "Back to gallery" button to use `closeLightbox`**

Already handled in step 4 — the close button calls `closeLightbox()` instead of `setLightboxIndex(null)`.

- [ ] **Step 6: Verify build**

Run: `npm run type-check && npm run build`
Expected: Pass.

- [ ] **Step 7: Commit**

```bash
git add app/(app)/map/components/cat-gallery-modal.tsx
git commit -m "feat(map): add tile-expansion animation to gallery lightbox"
```

---

### Task 5: Final Integration Verification & Cleanup

**Files:**

- Modify: `app/(app)/map/components/cat-gallery-modal.tsx` (cleanup unused imports)
- Verify: all modified files

**Interfaces:**

- Consumes: all prior tasks
- Produces: passing CI pipeline

- [ ] **Step 1: Remove unused imports**

In `cat-gallery-modal.tsx`, remove the `Loader2` import from lucide-react (replaced by shimmer). Confirm the full import list is:

```tsx
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { ChevronLeft, ChevronRight, MapPin, User, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { NearbyCat } from '@/lib/supabase/types'
```

- [ ] **Step 2: Remove old `bentoSpanClass` function**

Delete the entire `bentoSpanClass` function — it's replaced by `tileLayout` from Task 3.

- [ ] **Step 3: Run full CI pipeline locally**

```bash
npm run format:check && npm run lint && npm run type-check && npm run build
```

Expected: All four pass with zero errors/warnings.

- [ ] **Step 4: Fix any lint/format issues**

Run: `npm run format` if format:check fails.
Run: `npm run lint -- --fix` if lint fails.

- [ ] **Step 5: Manual smoke test checklist**

Open the app on mobile viewport (390×844) and verify:

1. Tap a cat marker → preview card appears
2. Tap the thumbnail → gallery expands FROM the thumbnail position
3. Shimmer skeleton shows briefly while photos load
4. Grid shows 2-column layout with hero + pairs + wide rhythm
5. Tiles scale down on press (active state)
6. Tap a tile → lightbox expands from that tile's position
7. Swipe/arrows work in lightbox
8. Close lightbox → image contracts back to tile
9. Close gallery → dialog contracts back to thumbnail
10. Test with browser DevTools "prefers-reduced-motion: reduce" → all transitions are instant opacity

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore(map): clean up gallery modal imports and unused code"
```
