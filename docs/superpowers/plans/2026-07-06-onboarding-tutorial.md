# Onboarding Tutorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the non-blocking welcome sheet and five coach marks (pin, tag FAB, filter, avatar-edit, share-profile) specified in `docs/superpowers/specs/2026-07-06-onboarding-tutorial-design.md`.

**Architecture:** Two independent pieces. (1) `WelcomeSheet` is a fully self-contained component — owns its own `localStorage` flag, mounted once from `/map` with no props. (2) Coach marks share one presentational `CoachMark` bubble and one `useSeenFlag` hook, but each page computes its own priority "waterfall" (which single hint is eligible right now) inline — there is no generic hints engine.

**Tech Stack:** Next.js 16 App Router, React Client Components, Tailwind CSS v4, react-leaflet (already installed), `localStorage`.

## Global Constraints

- No new dependencies — react-leaflet's `Tooltip` is already available (same package as the existing `Marker`/`MapContainer` imports).
- No generic "hints engine," no versioning, no expiry, no profile-linking on any flag — six flat `localStorage` booleans (spec §2 "Persistence"): `hasSeenWelcome`, `hasSeenPinHint`, `hasSeenTagHint`, `hasSeenFilterHint`, `hasSeenAvatarHint`, `hasSeenShareHint`.
- No coach mark or the welcome sheet may block interaction with the real UI — no backdrop, no focus trap, no required dismiss step (spec §1).
- This repo has no test framework (`find . -iname "*.test.*"` returns nothing; `package.json` has no `test` script). Verification per task is: `npm run type-check`, `npm run lint`, then a manual check in the browser with `localStorage.clear()` in devtools to reset flags. This replaces the "write failing test" step pattern for this plan only.
- Follow existing component conventions: `'use client'` at the top of any file using hooks/state, `cn()` from `@/lib/utils` for conditional classes, Tailwind arbitrary-free utility classes matching the surrounding file's style.

---

## Task 1: Shared primitives — `useSeenFlag` hook and `CoachMark` bubble

**Files:**

- Create: `lib/use-seen-flag.ts`
- Create: `app/(app)/components/coach-mark.tsx`

**Interfaces:**

- Produces: `useSeenFlag(key: string): [seen: boolean, markSeen: () => void]` — `seen` defaults to `true` (hidden) until mounted, so server and first client render agree and nothing flashes before `localStorage` has been checked.
- Produces: `<CoachMark text: string, arrow?: 'top' | 'bottom', className?: string />` — a small orange bubble with a connecting triangle, no positioning of its own (`className` supplies `fixed`/`absolute` + placement from the caller).

- [ ] **Step 1: Create the `useSeenFlag` hook**

```ts
// lib/use-seen-flag.ts
'use client'

import { useCallback, useEffect, useState } from 'react'

// Defaults to `true` (hidden) until mounted — the server has no access to
// localStorage, so the first client render must agree with the server to
// avoid a hydration mismatch. The real value is read in an effect and only
// then can a hint appear.
export function useSeenFlag(key: string): [boolean, () => void] {
  const [seen, setSeen] = useState(true)

  useEffect(() => {
    setSeen(localStorage.getItem(key) === '1')
  }, [key])

  const markSeen = useCallback(() => {
    localStorage.setItem(key, '1')
    setSeen(true)
  }, [key])

  return [seen, markSeen]
}
```

- [ ] **Step 2: Create the `CoachMark` component**

```tsx
// app/(app)/components/coach-mark.tsx
import { cn } from '@/lib/utils'

export function CoachMark({
  text,
  arrow = 'bottom',
  className,
}: {
  text: string
  arrow?: 'top' | 'bottom'
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none z-40 flex flex-col items-center', className)}
    >
      {arrow === 'top' && (
        <div className="border-b-primary h-0 w-0 border-x-8 border-b-8 border-x-transparent" />
      )}
      <div className="bg-primary text-primary-foreground animate-in fade-in zoom-in-95 max-w-[200px] rounded-xl px-3 py-2 text-center text-xs font-medium shadow-lg duration-300">
        {text}
      </div>
      {arrow === 'bottom' && (
        <div className="border-t-primary h-0 w-0 border-x-8 border-t-8 border-x-transparent" />
      )}
    </div>
  )
}
```

`aria-hidden` — this is a supplementary visual nudge; the underlying control it points at already has its own accessible name (`aria-label` on the FAB, filter button, avatar button, share button), so the tooltip text shouldn't be announced twice.

- [ ] **Step 3: Verify**

Run: `npm run type-check`
Expected: no errors (both files are new and have no consumers yet, so this only checks they compile in isolation).

- [ ] **Step 4: Commit**

```bash
git add lib/use-seen-flag.ts "app/(app)/components/coach-mark.tsx"
git commit -m "feat(map): add useSeenFlag hook and CoachMark bubble primitives"
```

---

## Task 2: Welcome sheet

**Files:**

- Create: `app/(app)/map/components/welcome-sheet.tsx`
- Modify: `app/(app)/map/page.tsx`

**Interfaces:**

- Consumes: `useSeenFlag` from Task 1 (`@/lib/use-seen-flag`).
- Produces: `<WelcomeSheet />` — no props, fully self-contained.

- [ ] **Step 1: Create the welcome sheet**

```tsx
// app/(app)/map/components/welcome-sheet.tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useSeenFlag } from '@/lib/use-seen-flag'

export function WelcomeSheet() {
  const [hasSeenWelcome, markSeen] = useSeenFlag('hasSeenWelcome')

  // Non-modal: any tap anywhere on the page (a pin, the Tag FAB, search,
  // filter icon, locate button) counts as "understood" just as much as
  // tapping "Got it" — this sheet must never be the one thing standing
  // between a first-time user and the real app.
  useEffect(() => {
    if (hasSeenWelcome) return
    document.addEventListener('pointerdown', markSeen, { capture: true })
    return () => document.removeEventListener('pointerdown', markSeen, { capture: true })
  }, [hasSeenWelcome, markSeen])

  if (hasSeenWelcome) return null

  return (
    <div className="bg-card/95 fixed inset-x-4 bottom-24 z-40 rounded-2xl border border-white/40 p-4 text-center shadow-lg backdrop-blur-md dark:border-white/10">
      <p className="font-heading text-base font-bold">🐱 Cat-A-Log</p>
      <p className="text-muted-foreground mt-1 text-sm">
        Spot a stray? Tag it. See who's nearby on the map.
      </p>
      <Button type="button" className="mt-3 w-full" onClick={markSeen}>
        Got it
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Render it from the map page**

In `app/(app)/map/page.tsx`, add the import next to the other component imports (line 9):

```tsx
import { CatPreviewCard } from './components/cat-preview-card'
import { WelcomeSheet } from './components/welcome-sheet'
import { FilterSheet, type CatFilters, matchesFilters } from './components/filter-sheet'
```

Then render it as the first child inside the page's root `<div>` (currently starts at line 290, right after `<CatMap .../>`):

```tsx
  return (
    <div className="relative -mb-28 h-dvh overflow-hidden">
      <CatMap
        center={[location.lat, location.lng]}
        userLocation={userLocation ?? [location.lat, location.lng]}
        cats={filteredCats}
        catTags={catTags}
        selectedCatId={selectedCatId}
        onSelectCat={(cat) => setSelectedCatId(cat.id)}
        onMoveEnd={handleMoveEnd}
        onUserDrag={handleUserDrag}
        flyTo={flyToTarget}
        flyToZoom={flyToZoom}
      />

      <WelcomeSheet />

      <div className="absolute inset-x-4 top-4 z-10 flex items-center gap-2">
```

(Only the `<WelcomeSheet />` line is new here — `onSelectCat` gets its pin-hint wiring in Task 3, don't change it yet.)

- [ ] **Step 3: Verify**

Run: `npm run type-check && npm run lint`
Expected: no errors.

Manual check: `npm run dev`, open `/map`, open devtools console and run `localStorage.clear()`, reload. The sheet should appear over a live, pannable map. Tap anywhere on the map (not "Got it") — the sheet disappears. Reload `/map` again — it does not reappear. Run `localStorage.clear()` again, reload, and this time tap "Got it" directly — same result.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/map/components/welcome-sheet.tsx" "app/(app)/map/page.tsx"
git commit -m "feat(map): add non-blocking first-run welcome sheet"
```

---

## Task 3: Map coach marks — pin, Tag FAB, filter

**Files:**

- Create: `app/(app)/map/components/tag-fab-hint.tsx`
- Create: `app/(app)/map/components/filter-hint.tsx`
- Modify: `app/(app)/map/components/cat-map.tsx`
- Modify: `app/globals.css`
- Modify: `app/(app)/map/page.tsx`
- Modify: `app/(app)/tag/page.tsx`

**Interfaces:**

- Consumes: `CoachMark` and `useSeenFlag` from Task 1.
- Produces: `CatMap` gains an optional prop `pinHintCatId?: string | null` — when a rendered single-cat marker's `cat.id` matches, it shows a permanent Leaflet tooltip.

- [ ] **Step 1: Add the Tag FAB hint component**

```tsx
// app/(app)/map/components/tag-fab-hint.tsx
import { CoachMark } from '@/app/(app)/components/coach-mark'

export function TagFabHint() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
      <CoachMark text="Tap here to tag a stray cat you've found." arrow="bottom" />
    </div>
  )
}
```

- [ ] **Step 2: Add the filter hint component**

```tsx
// app/(app)/map/components/filter-hint.tsx
import { CoachMark } from '@/app/(app)/components/coach-mark'

export function FilterHint() {
  return (
    <CoachMark
      text="Filter by ear-tip status or welfare tags."
      arrow="top"
      className="absolute top-16 right-4"
    />
  )
}
```

- [ ] **Step 3: Add the pin hint to `CatMap`**

In `app/(app)/map/components/cat-map.tsx`, add `Tooltip` to the react-leaflet import (line 5):

```tsx
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
```

Update `CatMarker` to accept and use a `showPinHint` prop (replace the whole function, currently lines 390–428):

```tsx
function CatMarker({
  cat,
  lat,
  lng,
  index,
  selectedCatId,
  tags,
  overlapCount,
  showPinHint,
  onSelectCat,
}: {
  cat: NearbyCat
  lat: number
  lng: number
  index: number
  selectedCatId: string | null
  tags: CatTag['tag'][]
  overlapCount?: number
  showPinHint: boolean
  onSelectCat: (cat: NearbyCat) => void
}) {
  const selected = cat.id === selectedCatId
  const icon = useMemo(
    () => makeCatIcon(cat, selected, index, tags, overlapCount),
    [cat, selected, index, tags, overlapCount]
  )

  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      opacity={selectedCatId && !selected ? 0.55 : 1}
      zIndexOffset={selected ? 1000 : overlapCount ? 500 : 0}
      eventHandlers={{ click: () => onSelectCat(cat) }}
    >
      {showPinHint && (
        <Tooltip permanent direction="top" className="coach-mark-tooltip">
          Tap a pin to see this cat's story.
        </Tooltip>
      )}
    </Marker>
  )
}
```

Update the `CatMap` function signature (currently lines 456–478) to accept `pinHintCatId`:

```tsx
export function CatMap({
  center,
  userLocation,
  cats,
  catTags,
  selectedCatId,
  onSelectCat,
  onMoveEnd,
  onUserDrag,
  flyTo = null,
  flyToZoom,
  pinHintCatId = null,
}: {
  center: [number, number]
  userLocation: [number, number]
  cats: NearbyCat[]
  catTags: Map<string, CatTag['tag'][]>
  selectedCatId: string | null
  onSelectCat: (cat: NearbyCat) => void
  onMoveEnd: (move: MapMoveEnd) => void
  onUserDrag?: () => void
  flyTo?: [number, number] | null
  flyToZoom?: number
  pinHintCatId?: string | null
}) {
```

And pass it through in the render loop (currently lines 509–521):

```tsx
        point.type === 'single' ? (
          <CatMarker
            key={point.cat.id}
            cat={point.cat}
            lat={point.lat}
            lng={point.lng}
            index={index}
            selectedCatId={selectedCatId}
            tags={catTags.get(point.cat.id) ?? NO_TAGS}
            overlapCount={point.overlapCount}
            showPinHint={point.cat.id === pinHintCatId}
            onSelectCat={onSelectCat}
          />
        ) : (
```

- [ ] **Step 4: Style the pin hint tooltip to match the other coach marks**

In `app/globals.css`, insert after the `.map-locate-pulse` rule (currently lines 241–243):

```css
.map-locate-pulse {
  animation: pulse-ring-primary 1.8s ease-out infinite;
}

/* Coach-mark pin hint: restyles Leaflet's default white tooltip box to match
   the orange bubble used by the other onboarding coach marks. */
.coach-mark-tooltip.leaflet-tooltip {
  background: var(--primary);
  color: var(--primary-foreground);
  border: none;
  border-radius: 0.75rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}
.coach-mark-tooltip.leaflet-tooltip-top::before {
  border-top-color: var(--primary);
}
```

- [ ] **Step 5: Wire the waterfall into the map page**

In `app/(app)/map/page.tsx`, add imports (alongside the other component imports):

```tsx
import { TagFabHint } from './components/tag-fab-hint'
import { FilterHint } from './components/filter-hint'
import { useSeenFlag } from '@/lib/use-seen-flag'
```

Add the hint state and the `nearestCat`/`activeMapHint` derivations right after the existing `filteredCats` and `selectedCat` declarations (currently lines 267–271):

```tsx
const filteredCats = useMemo(() => {
  return cats.filter((cat) => matchesFilters(cat, catTags.get(cat.id) ?? [], filters))
}, [cats, filters, catTags])

const selectedCat = filteredCats.find((cat) => cat.id === selectedCatId) ?? null

const [hasSeenPinHint, markPinHintSeen] = useSeenFlag('hasSeenPinHint')
const [hasSeenTagHint] = useSeenFlag('hasSeenTagHint')
const [hasSeenFilterHint, markFilterHintSeen] = useSeenFlag('hasSeenFilterHint')

// Nearest loaded marker — a one-line min, not a re-sort of the whole list.
const nearestCat = useMemo(() => {
  if (filteredCats.length === 0) return null
  return filteredCats.reduce((closest, cat) =>
    cat.distance_km < closest.distance_km ? cat : closest
  )
}, [filteredCats])

// Only one hint is ever active at a time, in priority order: browsing (pin)
// before contributing (tag) before power-user features (filter).
const activeMapHint =
  !hasSeenPinHint && nearestCat
    ? 'pin'
    : !hasSeenTagHint
      ? 'tag'
      : !hasSeenFilterHint
        ? 'filter'
        : null
```

Update the `CatMap` element to clear the pin hint on selection and pass `pinHintCatId` (currently lines 291–302):

```tsx
      <CatMap
        center={[location.lat, location.lng]}
        userLocation={userLocation ?? [location.lat, location.lng]}
        cats={filteredCats}
        catTags={catTags}
        selectedCatId={selectedCatId}
        onSelectCat={(cat) => {
          markPinHintSeen()
          setSelectedCatId(cat.id)
        }}
        onMoveEnd={handleMoveEnd}
        onUserDrag={handleUserDrag}
        flyTo={flyToTarget}
        flyToZoom={flyToZoom}
        pinHintCatId={activeMapHint === 'pin' && nearestCat ? nearestCat.id : null}
      />

      <WelcomeSheet />

      {activeMapHint === 'tag' && <TagFabHint />}
      {activeMapHint === 'filter' && <FilterHint />}
```

Update the filter button's `onClick` to clear the filter hint (currently lines 317–333):

```tsx
<Button
  type="button"
  variant="outline"
  size="icon"
  className="bg-card/70 dark:bg-card/90 relative shrink-0 rounded-full border-white/40 shadow-sm backdrop-blur-md dark:border-white/10"
  aria-label={
    filters.earTippedOnly || filters.tags.length > 0
      ? 'Filter cats (filters active)'
      : 'Filter cats'
  }
  onClick={() => {
    markFilterHintSeen()
    setFilterSheetOpen(true)
  }}
>
  <SlidersHorizontal />
  {(filters.earTippedOnly || filters.tags.length > 0) && (
    <span className="bg-primary border-card absolute top-1 right-1 h-2 w-2 rounded-full border" />
  )}
</Button>
```

- [ ] **Step 6: Clear the Tag FAB hint on entering `/tag`**

In `app/(app)/tag/page.tsx`, add the import:

```tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useSeenFlag } from '@/lib/use-seen-flag'
```

Add the effect inside `TagPage`, right after the existing `useState` declarations (currently lines 32–35):

```tsx
export default function TagPage() {
  const router = useRouter()
  const [screen, setScreen] = useState<Screen>({ type: 'photo' })
  const [history, setHistory] = useState<Screen[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const totalSteps = screen.type === 'match-found' ? 3 : 4

  const [, markTagHintSeen] = useSeenFlag('hasSeenTagHint')
  useEffect(() => {
    markTagHintSeen()
  }, [markTagHintSeen])
```

- [ ] **Step 7: Verify**

Run: `npm run type-check && npm run lint`
Expected: no errors.

Manual check with `npm run dev`, clearing `localStorage` between scenarios:

1. `localStorage.clear()`, reload `/map` with cats loaded nearby (tag one first if your test account has none) — after dismissing the welcome sheet, the pin hint tooltip appears on the nearest marker. Pan/zoom the map — the tooltip stays anchored.
2. Tap that marker (or any other pin) — the tooltip disappears for good. Reload `/map` — the Tag FAB hint now appears instead.
3. Tap the Tag FAB (enter `/tag`) — go back to `/map`. Neither the pin nor Tag FAB hint appears; the filter hint now appears near the filter icon.
4. Tap the filter icon — reload `/map`. No hints appear.
5. `localStorage.clear()`, reload `/map` with no cats nearby (or filtered out) — no pin hint (nothing to anchor to); the Tag FAB hint appears directly.

- [ ] **Step 8: Commit**

```bash
git add "app/(app)/map/components/tag-fab-hint.tsx" "app/(app)/map/components/filter-hint.tsx" "app/(app)/map/components/cat-map.tsx" app/globals.css "app/(app)/map/page.tsx" "app/(app)/tag/page.tsx"
git commit -m "feat(map): add pin, tag FAB, and filter coach marks"
```

---

## Task 4: Profile coach marks — avatar edit, share profile

**Files:**

- Modify: `app/(app)/profile/[username]/components/profile-header.tsx`
- Modify: `app/(app)/profile/[username]/components/share-profile-button.tsx`

**Interfaces:**

- Consumes: `CoachMark` and `useSeenFlag` from Task 1.
- `ShareProfileButton` gains an optional prop `onOpen?: () => void`, called only when its dropdown transitions from closed to open.

- [ ] **Step 1: Let `ShareProfileButton` report when it opens**

In `app/(app)/profile/[username]/components/share-profile-button.tsx`, update the function signature (currently line 9):

```tsx
export function ShareProfileButton({
  username,
  onOpen,
}: {
  username: string
  onOpen?: () => void
}) {
```

Update the trigger button's `onClick` (currently lines 70–79):

```tsx
<Button
  type="button"
  variant="ghost"
  size="icon"
  aria-label="Share profile"
  disabled={loading}
  onClick={() =>
    setOpen((prev) => {
      const next = !prev
      if (next) onOpen?.()
      return next
    })
  }
>
  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
</Button>
```

- [ ] **Step 2: Add the avatar and share hints to `ProfileHeader`**

In `app/(app)/profile/[username]/components/profile-header.tsx`, add imports (currently lines 1–7):

```tsx
'use client'

import { Camera, Loader2, User } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { ShareProfileButton } from './share-profile-button'
import { useAvatarUpload } from './avatar-upload-provider'
import { avatarDialogOpen } from './avatar-upload-dialog'
import { useSeenFlag } from '@/lib/use-seen-flag'
import { CoachMark } from '@/app/(app)/components/coach-mark'
```

Replace the `ProfileHeader` function body (currently lines 18–78) with:

```tsx
export function ProfileHeader({
  username,
  avatarUrl,
  bio,
  catsCount,
  totalSightings,
  isOwner,
}: ProfileHeaderProps) {
  const initials = username.slice(0, 2).toUpperCase()

  const [hasSeenAvatarHint, markAvatarHintSeen] = useSeenFlag('hasSeenAvatarHint')
  const [hasSeenShareHint, markShareHintSeen] = useSeenFlag('hasSeenShareHint')
  // Two-step waterfall, owner-only: personalizing your own profile (avatar)
  // comes before wanting to share it.
  const showAvatarHint = isOwner && !hasSeenAvatarHint
  const showShareHint = isOwner && hasSeenAvatarHint && !hasSeenShareHint

  return (
    <>
      {/* Top bar */}
      <div className="flex w-full items-center justify-between">
        <div>{/* spacer */}</div>
        <div className="flex items-center gap-2">
          {isOwner && <ThemeToggle />}
          <div className="relative">
            <ShareProfileButton username={username} onOpen={markShareHintSeen} />
            {showShareHint && (
              <CoachMark
                text="Share your profile."
                arrow="top"
                className="absolute top-full right-0 mt-2"
              />
            )}
          </div>
        </div>
      </div>

      {/* Avatar */}
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300">
        {isOwner ? (
          <AvatarWithEdit
            avatarUrl={avatarUrl}
            username={username}
            initials={initials}
            showHint={showAvatarHint}
            onOpen={markAvatarHintSeen}
          />
        ) : (
          <AvatarDisplay avatarUrl={avatarUrl} username={username} initials={initials} />
        )}
      </div>

      {/* Username + bio */}
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-backwards space-y-2 motion-safe:delay-100 motion-safe:duration-300">
        <h1 className="font-heading text-2xl font-bold tracking-tight">@{username}</h1>
        {bio && (
          <p className="text-muted-foreground mx-auto max-w-[280px] text-sm leading-relaxed">
            {bio}
          </p>
        )}
      </div>

      {/* Stats strip */}
      {catsCount > 0 && (
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-backwards bg-muted/50 flex w-full items-center justify-center gap-6 rounded-xl px-4 py-3 motion-safe:delay-150 motion-safe:duration-300">
          <div className="text-center">
            <p className="text-foreground text-lg font-bold">{catsCount}</p>
            <p className="text-muted-foreground text-xs">
              {catsCount === 1 ? 'Cat' : 'Cats'} tagged
            </p>
          </div>
          <div className="bg-border h-8 w-px" />
          <div className="text-center">
            <p className="text-foreground text-lg font-bold">{totalSightings}</p>
            <p className="text-muted-foreground text-xs">
              {totalSightings === 1 ? 'Sighting' : 'Sightings'}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
```

Update `AvatarWithEdit` to accept and render the hint (replace the whole function, currently lines 107–161):

```tsx
/** Avatar with edit overlay for owner — consumes AvatarUploadProvider context */
function AvatarWithEdit({
  avatarUrl,
  username,
  initials,
  showHint,
  onOpen,
}: {
  avatarUrl: string | null
  username: string
  initials: string
  showHint: boolean
  onOpen: () => void
}) {
  const { isUploading, previewUrl } = useAvatarUpload()
  const displayUrl = previewUrl ?? avatarUrl

  function handleTap() {
    onOpen()
    avatarDialogOpen?.()
  }

  return (
    <button
      type="button"
      onClick={handleTap}
      className="group relative"
      aria-label="Change profile photo"
      aria-busy={isUploading}
    >
      {/* Avatar circle */}
      {displayUrl ? (
        <div className="ring-primary/20 h-24 w-24 overflow-hidden rounded-full ring-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={displayUrl} alt={username} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="bg-primary text-primary-foreground flex h-24 w-24 items-center justify-center rounded-full text-2xl font-semibold">
          {initials ?? <User className="h-10 w-10" />}
        </div>
      )}

      {/* Upload spinner overlay */}
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
          <span className="sr-only" role="status">
            Uploading avatar
          </span>
        </div>
      )}

      {/* Edit badge (camera icon) — bottom-right */}
      {!isUploading && (
        <div className="bg-primary text-primary-foreground absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full shadow-md transition-transform group-hover:scale-110">
          <Camera className="h-3.5 w-3.5" />
        </div>
      )}

      {showHint && (
        <CoachMark
          text="Add a profile photo."
          arrow="top"
          className="absolute top-full left-1/2 mt-2 -translate-x-1/2"
        />
      )}
    </button>
  )
}
```

- [ ] **Step 3: Verify**

Run: `npm run type-check && npm run lint`
Expected: no errors.

Manual check with `npm run dev`:

1. `localStorage.clear()`, sign in, open `/profile/me` — the avatar-edit hint appears under the avatar.
2. Tap the avatar (opens the upload dialog) — close it, reload `/profile/me` — the avatar hint is gone; the share-profile hint now appears near the share icon.
3. Tap the share icon — reload `/profile/me` — neither hint appears.
4. Visit someone else's `/profile/[username]` (or open in a private window while signed out) — neither hint ever appears, regardless of flags.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/profile/[username]/components/profile-header.tsx" "app/(app)/profile/[username]/components/share-profile-button.tsx"
git commit -m "feat(profile): add avatar-edit and share-profile coach marks"
```

---

## Final check

- [ ] Run `npm run format:check && npm run lint && npm run type-check && npm run build` — this mirrors the CI pipeline in `.github/workflows/ci.yml` and must pass before opening a PR.
