# Day 3 — Live Map Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `/map` visual shell with a working map: real cat markers from `nearby_cats`, an explicit "search this area" refresh keyed to the visible viewport, and a filter sheet (ear-tipped + welfare tags).

**Architecture:** `app/(app)/map/page.tsx` becomes a Client Component orchestrator (state, geolocation, data fetching), delegating rendering to three new leaf components in `app/(app)/map/components/`: `CatMap` (Leaflet, dynamically imported with `ssr: false`), `CatPreviewCard` (selected-cat display), and `FilterSheet` (built on a new `components/ui/dialog.tsx` primitive). All data access is client-side Supabase (`nearby_cats` RPC + a `cat_tags` query), matching the existing pattern in `candidates-screen.tsx`. No SQL changes.

**Tech Stack:** Next.js 16 App Router, React 19, `leaflet` + `react-leaflet` (already installed), `@base-ui/react` (already installed, powers the new dialog primitive), Supabase client (`lib/supabase/client.ts`), Lucide React.

## Global Constraints

- TypeScript strict mode — every touched file must pass `npm run type-check` with zero errors.
- No test framework exists in this repo (no `npm test` script) — verification is `type-check`/`lint`/`build` plus manual browser walkthrough, matching this repo's existing convention.
- No new npm dependencies — `leaflet`, `react-leaflet`, and `@base-ui/react` are already installed and already used elsewhere in this codebase.
- No changes to the `nearby_cats` SQL function and no new migration — filtering by welfare tag is done client-side against a second `cat_tags` query, per the approved design spec.
- Component placement: colocate at the narrowest scope that's true (`AGENTS.md` "UI conventions") — page-only components live in `app/(app)/map/components/`; only the new Dialog primitive (cross-cutting, built the same way as `components/ui/checkbox.tsx`) goes in `components/ui/`.
- Supabase: Client Components use `lib/supabase/client.ts` exclusively — this feature has no server-fetched data, so no Server Component is introduced.
- Commits follow Conventional Commits (`AGENTS.md`) — one commit per task, scope `map`.
- Lucide icons only — no emoji.
- Reuse the existing `LocationState` geolocation pattern from `app/(app)/tag/components/photo-screen.tsx` (loading/success/error, `navigator.geolocation.getCurrentPosition({ enableHighAccuracy: true })`) for consistency — do not modify `photo-screen.tsx` itself.

---

### Task 1: `components/ui/dialog.tsx` — Base UI dialog primitive

**Files:**

- Create: `components/ui/dialog.tsx`

**Interfaces:**

- Consumes: `@base-ui/react/dialog` (already installed; same import pattern as `components/ui/checkbox.tsx`'s `@base-ui/react/checkbox`).
- Produces: `Dialog` (= `DialogPrimitive.Root`, props: `open: boolean`, `onOpenChange: (open: boolean, eventDetails) => void`, `children`), `DialogContent` (props: `className?: string`, `children`, plus any `DialogPrimitive.Popup.Props`), `DialogTitle` (props: `className?: string`, `children`). Task 4 (`filter-sheet.tsx`) consumes all three.

- [ ] **Step 1: Create `components/ui/dialog.tsx`**

```typescript
'use client'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root

function DialogContent({ className, children, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal data-slot="dialog-portal">
      <DialogPrimitive.Backdrop
        data-slot="dialog-backdrop"
        className="fixed inset-0 z-50 bg-black/50 motion-safe:data-[open]:animate-in motion-safe:data-[open]:fade-in motion-safe:duration-200"
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          'bg-card border-border fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t p-6 shadow-lg motion-safe:data-[open]:animate-in motion-safe:data-[open]:slide-in-from-bottom motion-safe:duration-200',
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('font-heading text-lg font-medium', className)}
      {...props}
    />
  )
}

export { Dialog, DialogContent, DialogTitle }
```

- [ ] **Step 2: Run verification gate**

```bash
npm run type-check
npm run lint
npm run build
```

Expected: all pass. (No page imports this yet, so `build` passes on unused-file grounds alone — this step just confirms the new file itself is well-typed and lint-clean.)

- [ ] **Step 3: Commit**

```bash
git add components/ui/dialog.tsx
git commit -m "feat(map): add Base UI dialog primitive"
```

---

### Task 2: `app/(app)/map/components/cat-map.tsx` — Leaflet map with cat markers

**Files:**

- Create: `app/(app)/map/components/cat-map.tsx`

**Interfaces:**

- Consumes: `NearbyCat` from `@/lib/supabase/types` (`{ id, name, primary_photo_url, lat, lng, is_ear_tipped, notes, tagged_by, confidence_score, created_at, distance_km }`).
- Produces: `export type MapMoveEnd = { lat: number; lng: number; radiusKm: number }` and `export function CatMap(props: { center: [number, number]; cats: NearbyCat[]; selectedCatId: string | null; onSelectCat: (cat: NearbyCat) => void; onMoveEnd: (move: MapMoveEnd) => void })`. Task 5 (`page.tsx`) dynamically imports `CatMap` and consumes `MapMoveEnd`.

- [ ] **Step 1: Create `app/(app)/map/components/cat-map.tsx`**

```typescript
'use client'

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { NearbyCat } from '@/lib/supabase/types'

export type MapMoveEnd = { lat: number; lng: number; radiusKm: number }

const catIcon = L.divIcon({
  className: '',
  html: '<span class="bg-primary block h-3.5 w-3.5 rounded-full border-2 border-white shadow"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

const userIcon = L.divIcon({
  className: '',
  html: '<span class="block h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-500 shadow"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

function MapEvents({ onMoveEnd }: { onMoveEnd: (move: MapMoveEnd) => void }) {
  useMapEvents({
    moveend(e) {
      const map = e.target
      const center = map.getCenter()
      const radiusKm = center.distanceTo(map.getBounds().getNorthEast()) / 1000
      onMoveEnd({ lat: center.lat, lng: center.lng, radiusKm })
    },
  })
  return null
}

export function CatMap({
  center,
  cats,
  selectedCatId,
  onSelectCat,
  onMoveEnd,
}: {
  center: [number, number]
  cats: NearbyCat[]
  selectedCatId: string | null
  onSelectCat: (cat: NearbyCat) => void
  onMoveEnd: (move: MapMoveEnd) => void
}) {
  return (
    <MapContainer center={center} zoom={15} className="h-full w-full" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapEvents onMoveEnd={onMoveEnd} />
      <Marker position={center} icon={userIcon} />
      {cats.map((cat) => (
        <Marker
          key={cat.id}
          position={[cat.lat, cat.lng]}
          icon={catIcon}
          opacity={selectedCatId && selectedCatId !== cat.id ? 0.6 : 1}
          eventHandlers={{ click: () => onSelectCat(cat) }}
        />
      ))}
    </MapContainer>
  )
}
```

The orange cat-marker dot uses `bg-primary` (a literal class name string inside the `html` template, picked up by Tailwind's content scan same as any other source occurrence) so it tracks the brand color in both light and dark mode. The blue user-location dot is a deliberate exception — it's the universal "this is you" map convention, not a brand element.

- [ ] **Step 2: Run verification gate**

```bash
npm run type-check
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/map/components/cat-map.tsx"
git commit -m "feat(map): add Leaflet map with cat markers"
```

---

### Task 3: `app/(app)/map/components/cat-preview-card.tsx` — selected cat display

**Files:**

- Create: `app/(app)/map/components/cat-preview-card.tsx`

**Interfaces:**

- Consumes: `NearbyCat`, `CatTag` from `@/lib/supabase/types` (`CatTag['tag']` is `'needs_medical' | 'possible_rabies' | 'deceased'`).
- Produces: `export function CatPreviewCard(props: { cat: NearbyCat; tags: CatTag['tag'][]; onClose: () => void })`. Task 5 (`page.tsx`) renders this when a cat is selected.

- [ ] **Step 1: Create `app/(app)/map/components/cat-preview-card.tsx`**

```typescript
import { MapPin, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { CatTag, NearbyCat } from '@/lib/supabase/types'

const TAG_LABELS: Record<CatTag['tag'], string> = {
  needs_medical: 'Needs medical attention',
  possible_rabies: 'Possible rabies',
  deceased: 'Deceased',
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m away`
  return `${km.toFixed(1)}km away`
}

export function CatPreviewCard({
  cat,
  tags,
  onClose,
}: {
  cat: NearbyCat
  tags: CatTag['tag'][]
  onClose: () => void
}) {
  return (
    <Card className="absolute inset-x-4 bottom-24 flex-row items-start gap-3 p-3 shadow-lg">
      <div className="bg-secondary h-16 w-16 shrink-0 overflow-hidden rounded-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cat.primary_photo_url}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="font-heading truncate font-medium">{cat.name ?? 'Unnamed cat'}</p>
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <MapPin className="h-3 w-3 shrink-0" />
          <span>{formatDistance(cat.distance_km)}</span>
        </div>
        {(cat.is_ear_tipped || tags.length > 0) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {cat.is_ear_tipped && (
              <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-[11px]">
                Ear-tipped
              </span>
            )}
            {tags.map((tag) => (
              <span
                key={tag}
                className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-[11px]"
              >
                {TAG_LABELS[tag]}
              </span>
            ))}
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        aria-label="Close"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
    </Card>
  )
}
```

- [ ] **Step 2: Run verification gate**

```bash
npm run type-check
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/map/components/cat-preview-card.tsx"
git commit -m "feat(map): add cat preview card component"
```

---

### Task 4: `app/(app)/map/components/filter-sheet.tsx` — ear-tipped + tag filter

**Files:**

- Create: `app/(app)/map/components/filter-sheet.tsx`

**Interfaces:**

- Consumes: `Dialog`, `DialogContent`, `DialogTitle` from `@/components/ui/dialog` (Task 1); `Checkbox` from `@/components/ui/checkbox`; `Label` from `@/components/ui/label`; `Button` from `@/components/ui/button`; `CatTag` from `@/lib/supabase/types`.
- Produces: `export type CatFilters = { earTippedOnly: boolean; tags: CatTag['tag'][] }` and `export function FilterSheet(props: { open: boolean; onOpenChange: (open: boolean) => void; filters: CatFilters; onApply: (filters: CatFilters) => void })`. Task 5 (`page.tsx`) owns the `CatFilters` state and consumes both.

- [ ] **Step 1: Create `app/(app)/map/components/filter-sheet.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { CatTag } from '@/lib/supabase/types'

export type CatFilters = {
  earTippedOnly: boolean
  tags: CatTag['tag'][]
}

const TAG_OPTIONS: { value: CatTag['tag']; label: string }[] = [
  { value: 'needs_medical', label: 'Needs medical attention' },
  { value: 'possible_rabies', label: 'Possible rabies' },
  { value: 'deceased', label: 'Deceased' },
]

export function FilterSheet({
  open,
  onOpenChange,
  filters,
  onApply,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: CatFilters
  onApply: (filters: CatFilters) => void
}) {
  const [draft, setDraft] = useState<CatFilters>(filters)

  function toggleTag(tag: CatTag['tag'], checked: boolean) {
    setDraft((prev) => ({
      ...prev,
      tags: checked ? [...prev.tags, tag] : prev.tags.filter((t) => t !== tag),
    }))
  }

  function handleApply() {
    onApply(draft)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(filters)
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogTitle>Filter cats</DialogTitle>

        <div className="mt-4 flex items-center gap-2">
          <Checkbox
            id="ear-tipped-filter"
            checked={draft.earTippedOnly}
            onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, earTippedOnly: checked }))}
          />
          <Label htmlFor="ear-tipped-filter" className="font-normal">
            Ear-tipped only
          </Label>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {TAG_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <Checkbox
                id={`tag-filter-${option.value}`}
                checked={draft.tags.includes(option.value)}
                onCheckedChange={(checked) => toggleTag(option.value, checked)}
              />
              <Label htmlFor={`tag-filter-${option.value}`} className="font-normal">
                {option.label}
              </Label>
            </div>
          ))}
        </div>

        <Button type="button" className="mt-6 w-full" onClick={handleApply}>
          Apply filters
        </Button>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Run verification gate**

```bash
npm run type-check
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/map/components/filter-sheet.tsx"
git commit -m "feat(map): add cat filter sheet"
```

---

### Task 5: Wire up `app/(app)/map/page.tsx` — geolocation, live data, search, filtering

**Files:**

- Modify: `app/(app)/map/page.tsx` (full replacement)

**Interfaces:**

- Consumes: `CatMap`, `MapMoveEnd` from `./components/cat-map` (Task 2); `CatPreviewCard` from `./components/cat-preview-card` (Task 3); `FilterSheet`, `CatFilters` from `./components/filter-sheet` (Task 4); `createClient` from `@/lib/supabase/client`; `NearbyCat`, `CatTag` from `@/lib/supabase/types`; the `nearby_cats` RPC (`Args: { user_lat: number; user_lng: number; radius_km?: number }`, `Returns: NearbyCat[]`).
- Produces: nothing consumed elsewhere — this is a leaf page.

- [ ] **Step 1: Replace `app/(app)/map/page.tsx` in full**

```typescript
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, MapPin, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CatPreviewCard } from './components/cat-preview-card'
import { FilterSheet, type CatFilters } from './components/filter-sheet'
import type { MapMoveEnd } from './components/cat-map'
import type { CatTag, NearbyCat } from '@/lib/supabase/types'

const CatMap = dynamic(() => import('./components/cat-map').then((mod) => mod.CatMap), {
  ssr: false,
})

const INITIAL_RADIUS_KM = 2

type LocationState =
  | { status: 'loading' }
  | { status: 'success'; lat: number; lng: number }
  | { status: 'error' }

export default function MapPage() {
  const [location, setLocation] = useState<LocationState>({ status: 'loading' })
  const [cats, setCats] = useState<NearbyCat[]>([])
  const [catTags, setCatTags] = useState<Map<string, CatTag['tag'][]>>(new Map())
  const [loadingCats, setLoadingCats] = useState(false)
  const [filters, setFilters] = useState<CatFilters>({ earTippedOnly: false, tags: [] })
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
  const [pendingSearch, setPendingSearch] = useState<MapMoveEnd | null>(null)
  const [searchStale, setSearchStale] = useState(false)
  // Leaflet fires `moveend` once immediately on mount (from the initial setView) —
  // ignore that first event so the pill doesn't flip to "stale" before the user has panned.
  const firstMoveEndRef = useRef(true)

  async function fetchCats(lat: number, lng: number, radiusKm: number) {
    setLoadingCats(true)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('nearby_cats', {
      user_lat: lat,
      user_lng: lng,
      radius_km: radiusKm,
    })

    if (error) {
      toast.error('Could not load nearby cats')
      setLoadingCats(false)
      return
    }

    const nearbyCats = data ?? []
    setCats(nearbyCats)
    setSelectedCatId(null)

    if (nearbyCats.length > 0) {
      const { data: tagRows, error: tagError } = await supabase
        .from('cat_tags')
        .select('cat_id, tag')
        .in(
          'cat_id',
          nearbyCats.map((cat) => cat.id)
        )

      if (tagError) {
        toast.error('Could not load cat tags')
      } else {
        const tagMap = new Map<string, CatTag['tag'][]>()
        for (const row of tagRows ?? []) {
          tagMap.set(row.cat_id, [...(tagMap.get(row.cat_id) ?? []), row.tag])
        }
        setCatTags(tagMap)
      }
    } else {
      setCatTags(new Map())
    }

    setLoadingCats(false)
  }

  function fetchLocation() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setLocation({ status: 'success', lat, lng })
        fetchCats(lat, lng, INITIAL_RADIUS_KM)
      },
      () => setLocation({ status: 'error' }),
      { enableHighAccuracy: true }
    )
  }

  function retryLocation() {
    setLocation({ status: 'loading' })
    fetchLocation()
  }

  useEffect(() => {
    fetchLocation()
  }, [])

  function handleMoveEnd(move: MapMoveEnd) {
    if (firstMoveEndRef.current) {
      firstMoveEndRef.current = false
      return
    }
    setPendingSearch(move)
    setSearchStale(true)
  }

  function handleSearchThisArea() {
    if (!pendingSearch) return
    fetchCats(pendingSearch.lat, pendingSearch.lng, pendingSearch.radiusKm)
    setSearchStale(false)
  }

  function handleApplyFilters(next: CatFilters) {
    setFilters(next)
    setSelectedCatId(null)
  }

  const filteredCats = useMemo(() => {
    return cats.filter((cat) => {
      if (filters.earTippedOnly && !cat.is_ear_tipped) return false
      if (filters.tags.length > 0) {
        const tags = catTags.get(cat.id) ?? []
        if (!filters.tags.some((tag) => tags.includes(tag))) return false
      }
      return true
    })
  }, [cats, filters, catTags])

  const selectedCat = filteredCats.find((cat) => cat.id === selectedCatId) ?? null

  if (location.status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (location.status === 'error') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <MapPin className="text-muted-foreground h-8 w-8" />
        <p className="text-muted-foreground text-sm">Location unavailable</p>
        <Button type="button" variant="outline" onClick={retryLocation}>
          Tap to retry
        </Button>
      </div>
    )
  }

  return (
    <div className="relative h-screen overflow-hidden">
      <CatMap
        center={[location.lat, location.lng]}
        cats={filteredCats}
        selectedCatId={selectedCatId}
        onSelectCat={(cat) => setSelectedCatId(cat.id)}
        onMoveEnd={handleMoveEnd}
      />

      <div className="absolute inset-x-4 top-4 flex items-center gap-2">
        {searchStale ? (
          <Button
            type="button"
            variant="outline"
            className="bg-card flex-1 justify-start gap-2 rounded-full shadow-sm"
            onClick={handleSearchThisArea}
          >
            {loadingCats ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Search className="h-4 w-4 shrink-0" />
            )}
            <span className="text-sm">Search this area</span>
          </Button>
        ) : (
          <div className="border-border bg-card text-muted-foreground flex flex-1 items-center gap-2 rounded-full border px-4 py-2.5 shadow-sm">
            <Search className="h-4 w-4 shrink-0" />
            <span className="text-sm">
              {loadingCats
                ? 'Searching…'
                : filteredCats.length === 0
                  ? 'No cats found nearby'
                  : `${filteredCats.length} cat${filteredCats.length === 1 ? '' : 's'} nearby`}
            </span>
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="bg-card shrink-0 rounded-full shadow-sm"
          aria-label="Filter cats"
          onClick={() => setFilterSheetOpen(true)}
        >
          <SlidersHorizontal />
        </Button>
      </div>

      {selectedCat && (
        <CatPreviewCard
          cat={selectedCat}
          tags={catTags.get(selectedCat.id) ?? []}
          onClose={() => setSelectedCatId(null)}
        />
      )}

      <FilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filters={filters}
        onApply={handleApplyFilters}
      />
    </div>
  )
}
```

- [ ] **Step 2: Run verification gate**

```bash
npm run type-check
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 3: Manual check**

```bash
npm run dev
```

Visit `/map` at a 375px viewport width, with a real Supabase session and at least one existing cat within a few km of your test location (use browser devtools geolocation override if needed). Confirm:

- Location permission prompt → grant → map centers on you, a blue user-location dot appears, orange cat dots appear for nearby cats, pill shows "N cats nearby".
- Deny location → "Location unavailable" state appears → tap "Tap to retry" → grant this time → map loads.
- Pan or zoom the map → pill switches to an active "Search this area" button → tap it → pill returns to idle text reflecting the new result count, markers update.
- Tap the filter icon → sheet opens from the bottom → toggle "Ear-tipped only" and each tag checkbox in combination → tap "Apply filters" → sheet closes, markers update accordingly, selection clears.
- Tap a cat marker → preview card appears at the bottom with real name/photo/distance/badges, doesn't overlap the bottom nav → tap the X → card closes.
- Test a location/radius with zero matching cats → pill shows "No cats found nearby" instead of nothing.
- No horizontal scroll, no emoji, dark mode still looks correct (toggle from `/profile/me`).

Stop the dev server after checking.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/map/page.tsx"
git commit -m "feat(map): wire up live map with search and filtering"
```

---

### Task 6: Full verification pass

**Files:** none (verification only, no commit)

- [ ] **Step 1: Run the full CI-equivalent gate**

```bash
npm run format:check
npm run lint
npm run type-check
npm run build
```

Expected: all four pass with zero errors/warnings.

- [ ] **Step 2: Manual walkthrough**

Repeat the full manual check from Task 5, Step 3, plus: confirm `/tag`'s catch-a-cat flow still works end-to-end (unaffected by this change) and that `/profile/me`'s dark mode toggle still affects `/map` correctly. Confirm `AGENTS.md`'s "Pages still to be built" note for `/map` can now be removed as a follow-up (not part of this plan — flag it, don't edit `AGENTS.md` here).
