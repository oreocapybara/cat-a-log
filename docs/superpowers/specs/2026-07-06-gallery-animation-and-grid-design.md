# Gallery Animation & Grid Redesign

## Summary

Redesign the cat gallery modal's open/close animation to use origin-expansion (thumbnail grows into gallery, gallery contracts back to thumbnail), replace the 4-column 80px bento grid with a 2-column aspect-ratio-driven layout, and add micro-interactions for tactile feedback throughout.

## Context

- **File:** `app/(app)/map/components/cat-gallery-modal.tsx`
- **Triggered from:** `cat-preview-card.tsx` — the 64×64 thumbnail and the sightings badge
- **Current animation:** Base UI Dialog default `zoom-in-95 + fade-in` (200ms). Generic, no spatial relationship to the trigger element.
- **Available tools:** `tw-animate-css`, native CSS `@keyframes`, Tailwind v4 utilities. No Framer Motion or spring library.
- **Constraints:** Must respect `prefers-reduced-motion: reduce`. Must not add new dependencies.

---

## 1. Animation System — Spatial Expansion Language

### Core Principle

Every transition is an expansion/contraction from a spatial anchor. The user always knows where they are in the hierarchy because things grow from where they tapped and shrink back when dismissed.

### 1.1 Gallery Open (thumbnail → dialog)

| Step | What happens                                                                                                                   | Timing                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 1    | User taps the 64×64 thumbnail on the preview card                                                                              | —                                                                          |
| 2    | Capture thumbnail's viewport rect via `getBoundingClientRect()`                                                                | Instant                                                                    |
| 3    | Dialog container appears at the thumbnail's exact position/size with `border-radius: 12px` (matching thumbnail's `rounded-xl`) | Frame 0                                                                    |
| 4    | Container expands to final `inset-4 rounded-3xl` position                                                                      | 350ms, `cubic-bezier(0.32, 0.72, 0, 1)`                                    |
| 5    | Thumbnail image crossfades into hero tile position during expansion                                                            | In sync with step 4                                                        |
| 6    | Backdrop fades in (black/70)                                                                                                   | 350ms, same duration                                                       |
| 7    | Once container reaches ~80% size (~280ms), remaining bento tiles cascade in                                                    | 30ms stagger per tile, each `opacity 0→1` + `translateY(8px→0)` over 200ms |

**Easing rationale:** `cubic-bezier(0.32, 0.72, 0, 1)` — fast initial movement (object reaches ~80% of destination in first 150ms), then decelerates softly. Feels faster than a linear 250ms while actually taking 350ms. Research (Nielsen Norman Group): 200-500ms is the sweet spot for transitional UI animations.

### 1.2 Gallery Close (dialog → thumbnail)

| Step | What happens                                                                                 | Timing                   |
| ---- | -------------------------------------------------------------------------------------------- | ------------------------ |
| 1    | Bento tiles fade out simultaneously (no stagger — exits should feel snappier than entrances) | 100ms                    |
| 2    | Container contracts from full rect back to thumbnail's viewport rect                         | 300ms, same cubic-bezier |
| 3    | Border-radius morphs from 24px → 12px                                                        | In sync with step 2      |
| 4    | Backdrop opacity fades out                                                                   | 300ms, in sync           |

**Asymmetry rationale:** Close is 50ms faster than open. Users initiating a close have already processed the content — they want to return, not watch an animation. Faster exit respects that intent.

### 1.3 Lightbox Open (tile → fullscreen)

| Step | What happens                                                        | Timing                                |
| ---- | ------------------------------------------------------------------- | ------------------------------------- |
| 1    | Capture tapped tile's rect within the gallery viewport              | Instant                               |
| 2    | Tile image expands from its grid position to fill the lightbox area | 250ms, same cubic-bezier              |
| 3    | Black backdrop fades in underneath the expanding image              | 250ms                                 |
| 4    | Metadata bar (date, username, "view on map") slides up from below   | 200ms, 60ms delay after image settles |

### 1.4 Lightbox Close (fullscreen → tile)

| Step | What happens                                     | Timing                   |
| ---- | ------------------------------------------------ | ------------------------ |
| 1    | Metadata bar fades out                           | 80ms                     |
| 2    | Image contracts back to the tile's grid position | 250ms, same cubic-bezier |
| 3    | Backdrop fades out                               | 250ms, in sync           |

### 1.5 Reduced Motion

When `prefers-reduced-motion: reduce`:

- All spatial transitions (expand/contract) become instant opacity swaps (`opacity: 0→1`, no transform)
- Stagger delays are removed
- Backdrop still fades but over 100ms (still communicates layer change without motion)
- Tile press feedback is preserved (scale is minor enough to not trigger vestibular issues)

---

## 2. Grid Redesign — 2-Column Adaptive Layout

### Problems with Current Grid

- `auto-rows-[80px]` on 4 columns → each cell is ~80×80px on a 390px screen. Too small to identify a cat's face/markings.
- Deterministic bento rhythm (hero → 2 small → 1 wide → repeat) reads as algorithmic after 2 cycles.
- 4 columns on ~360px content area = ~85px per column. Too granular for photos.

### New Layout

```
┌─────────────────────┐
│                     │  Hero: full-width, aspect-[2/1]
│      HERO TILE      │  (this is the photo that expanded in)
│                     │
├──────────┬──────────┤
│          │          │  Pair: two square tiles, aspect-square
│  TILE 2  │  TILE 3  │
│          │          │
├──────────┴──────────┤
│                     │  Wide: full-width, aspect-video (16:9)
│      TILE 4         │
│                     │
├──────────┬──────────┤
│          │          │  Pair repeats...
│  TILE 5  │  TILE 6  │
│          │          │
└──────────┴──────────┘
```

### Specifications

| Property    | Value                               |
| ----------- | ----------------------------------- |
| Columns     | 2 (`grid-cols-2`)                   |
| Gap         | `gap-2` (8px)                       |
| Hero tile   | `col-span-2`, `aspect-[2/1]`        |
| Pair tiles  | `aspect-square` each                |
| Wide tiles  | `col-span-2`, `aspect-video`        |
| Tile radius | `rounded-xl`                        |
| Rhythm      | Hero → pair → wide → pair → wide... |

### Adaptive Cases (Few Photos)

| Count     | Layout                                                                           |
| --------- | -------------------------------------------------------------------------------- |
| 1 photo   | Hero only, full-width, `aspect-[3/2]` (taller than default hero)                 |
| 2 photos  | Hero (`aspect-[2/1]`) + one full-width tile below (`col-span-2`, `aspect-video`) |
| 3 photos  | Hero + one pair row (two squares)                                                |
| 4+ photos | Full rhythm as described                                                         |

### Rationale

- **Larger tiles** → faster visual scanning. Fitts's Law: bigger targets are easier/faster to tap.
- **Aspect-ratio variety** communicates "real photos" not "data grid." Instagram Explore uses a similar 1-2-1 rhythm.
- **Hero dominance** — the primary identity photo is always visible without scrolling, full-width.
- **2 columns** → each photo gets ~170px width minimum. Cat faces/markings are clearly recognizable.

---

## 3. Micro-interactions & Polish

### 3.1 Tile Press Feedback

- **Touch-down:** Scale to `0.96` + `brightness(0.92)` over 100ms ease-out. Communicates "registered your tap."
- **Touch-up without completing tap (cancel):** Spring back to `scale(1)` over 150ms.
- **Implementation:** CSS `:active` pseudo-class with `transition: transform 100ms ease-out, filter 100ms ease-out`. The existing `group-active:scale-95` is close but doesn't include the brightness dim.

### 3.2 Loading State (Shimmer Placeholders)

Replace the current centered `<Loader2>` spinner with skeleton placeholders that preview the grid structure:

- Hero area: full-width shimmer rectangle at `aspect-[2/1]`
- Below: two square shimmer rectangles side by side
- Shimmer: CSS gradient animation sweeping left-to-right on `--muted` background color
- **Benefit:** No layout shift when data arrives. User knows what's coming. Reduces perceived wait time (progress indication > spinner).

```css
@keyframes shimmer {
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
    var(--muted-foreground) / 8% 50%,
    var(--muted) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

### 3.3 Scroll Header Enhancement

When the grid content scrolls behind the header:

- Header gains `border-b border-border/60` and `backdrop-blur-sm`
- Transition: 150ms ease, triggered by `IntersectionObserver` on a sentinel element at the top of the grid
- Communicates "there's content above" without a permanent visual element

### 3.4 Empty State (Single Photo)

When a cat has only 1 sighting (no grid needed):

- Hero fills most of the gallery space at `aspect-[3/2]`
- Below: centered text "Only one sighting so far" in `text-muted-foreground text-sm`
- Date and spotter username displayed below
- No awkward half-empty grid or lonely tiles

### 3.5 Backdrop Tap-to-Close

Tapping the dark overlay behind the dialog triggers the reverse-origin close animation. Same behavior as the close button — additional affordance for users who expect modal-backdrop dismissal.

---

## 4. Implementation Approach

### Required State

The parent (`cat-preview-card.tsx`) must pass the thumbnail's DOM ref (or its rect) to the gallery modal so the animation can target the correct origin point.

```tsx
// In cat-preview-card.tsx
const thumbnailRef = useRef<HTMLButtonElement>(null)

// Pass to gallery
<CatGalleryModal
  cat={renderedCat}
  open={galleryOpen}
  onOpenChange={setGalleryOpen}
  onViewLocation={handleViewLocation}
  originRef={thumbnailRef}
/>
```

### Animation Strategy

Use CSS custom properties set via inline styles for the dynamic rect values:

```css
.gallery-expanding {
  --origin-x: 0px;
  --origin-y: 0px;
  --origin-w: 64px;
  --origin-h: 64px;

  animation: gallery-expand 350ms cubic-bezier(0.32, 0.72, 0, 1) forwards;
}

@keyframes gallery-expand {
  from {
    top: var(--origin-y);
    left: var(--origin-x);
    width: var(--origin-w);
    height: var(--origin-h);
    border-radius: 12px;
  }
  to {
    top: 16px; /* inset-4 */
    left: 16px;
    width: calc(100vw - 32px);
    height: calc(100vh - 32px);
    border-radius: 24px;
  }
}
```

The dialog must NOT use Base UI's built-in `data-[starting-style]`/`data-[ending-style]` animations for the popup itself — those will be replaced with the custom origin-expansion keyframes. The backdrop can keep its fade-in/out via data-attributes.

### Tile Stagger

CSS `animation-delay` computed per tile via inline style:

```tsx
style={{ animationDelay: `${index * 30}ms` }}
```

Combined with a shared `gallery-tile-enter` class:

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

### Files to Modify

1. `app/(app)/map/components/cat-gallery-modal.tsx` — main rewrite (grid, animations, loading state, empty state)
2. `app/(app)/map/components/cat-preview-card.tsx` — add `thumbnailRef`, pass to gallery
3. `app/globals.css` — add gallery-specific keyframes and shimmer animation

### No New Dependencies

All animations use CSS keyframes + JS `getBoundingClientRect()`. No Framer Motion, no FLIP libraries. The existing `tw-animate-css` continues to handle the backdrop and utility classes.

---

## 5. Accessibility

- All animations gated behind `prefers-reduced-motion` media query
- Focus management unchanged (Base UI Dialog handles trap/restore)
- Tile press states use `:active` — keyboard users get `:focus-visible` ring instead
- Lightbox maintains arrow-key navigation for prev/next
- Close button remains the primary dismiss affordance; backdrop-tap is supplementary
- All images retain `alt=""` (decorative within the gallery context — the dialog title provides the semantic label)
