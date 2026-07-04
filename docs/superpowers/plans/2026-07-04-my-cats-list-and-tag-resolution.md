# My Cats List & Tag Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Day 4's `/profile/me` page: a "My Cats" list of the cats a user has tagged, plus a community-wide "resolve" mechanism for `needs_medical`/`possible_rabies` tags, per `docs/superpowers/specs/2026-07-04-my-cats-list-and-tag-management-design.md`.

**Architecture:** One migration adds `resolved_at`/`resolved_by` to `cat_tags` plus new RLS policies and a `deceased`-cascade trigger. A new client component `my-cats-list.tsx` renders the list with tap-to-toggle chips (insert/resolve/hard-delete). The map's `cat-preview-card.tsx` gets a lightweight resolve action reusing the same mutation shape. The map's active-tag query and filter logic get a one-line `resolved_at` fix and a `deceased`-exclusion rule.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + RLS + `supabase-js`), Tailwind v4, no test runner configured (lint + type-check + build + manual verification only).

## Global Constraints

- No test runner exists in this repo — verification is `npm run type-check`, `npm run lint`, and manual browser checks, not Jest/Vitest specs.
- All new SQL follows the existing migration house style: `SECURITY DEFINER` + `SET search_path = ''` + explicit `REVOKE EXECUTE` for trigger functions that only need to fire as triggers (see `supabase/migrations/20260702042949_fix_security_advisor_warnings.sql`).
- `deceased` label is renamed from "Deceased" to "Passed away" everywhere it renders (map card, filter sheet, My Cats list) — single source of truth is `TAG_META` in `lib/welfare-colors.ts`.
- Resolving is unilateral (no vote/confirm step) — matches how adding a tag already works.
- Deleting a cat entirely and the "share your collection" feature are explicitly out of scope.

---

### Task 1: Migration — resolve columns, RLS policies, deceased cascade

**Files:**

- Create: `supabase/migrations/<timestamp>_resolve_cat_tags.sql`
- Modify: `lib/supabase/types.ts:172-194` (the `cat_tags` table type)

**Interfaces:**

- Produces: `cat_tags.resolved_at` (`timestamptz | null`), `cat_tags.resolved_by` (`uuid | null`) — consumed by every later task that reads/writes `cat_tags`.
- Produces: `CatTag` type (from `lib/supabase/types.ts`) gains `resolved_at: string | null` and `resolved_by: string | null` fields.

- [ ] **Step 1: Create the migration file**

Run:

```bash
npx supabase migration new resolve_cat_tags
```

Expected: a new file `supabase/migrations/<timestamp>_resolve_cat_tags.sql` appears (empty, from the template).

- [ ] **Step 2: Write the migration SQL**

Open the new file and write:

```sql
-- ============================================================
-- RESOLVE CAT TAGS
-- Adds a soft-resolve state to cat_tags (needs_medical/possible_rabies can be
-- marked recovered/cleared by any authenticated user, not just the adder),
-- an additional hard-delete policy for the cat's owner, and a trigger that
-- auto-resolves other active tags when a cat is marked deceased.
-- ============================================================

ALTER TABLE cat_tags ADD COLUMN resolved_at timestamptz;
ALTER TABLE cat_tags ADD COLUMN resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Mirrors the existing community-wide INSERT policy: tagging is already
-- unilateral and community-wide, so resolving should be too.
CREATE POLICY "Authenticated users can resolve cat tags"
  ON cat_tags FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated' AND resolved_by = auth.uid());

-- Additive alongside the existing "Tag adder can remove their own tag" DELETE
-- policy — Postgres ORs multiple permissive policies for the same command,
-- so a tag can be hard-deleted by whoever added it OR the cat's owner.
CREATE POLICY "Cat owner can remove tags on their own cat"
  ON cat_tags FOR DELETE USING (
    auth.uid() = (SELECT tagged_by FROM public.cats WHERE id = cat_tags.cat_id)
  );

-- When a cat is tagged deceased, any other active tags on it are moot —
-- auto-resolve them in the same operation so the UI never shows a
-- contradictory "Needs medical" + "Passed away" state. SECURITY DEFINER +
-- pinned search_path + revoked direct EXECUTE matches the house pattern for
-- AFTER INSERT trigger functions (see increment_tags_count()).
CREATE OR REPLACE FUNCTION public.resolve_other_tags_on_deceased()
RETURNS trigger AS $$
BEGIN
  UPDATE public.cat_tags
  SET resolved_at = now(), resolved_by = NEW.added_by
  WHERE cat_id = NEW.cat_id AND tag <> 'deceased' AND resolved_at IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER cat_tags_after_insert_deceased_cascade
  AFTER INSERT ON cat_tags
  FOR EACH ROW
  WHEN (NEW.tag = 'deceased')
  EXECUTE FUNCTION public.resolve_other_tags_on_deceased();

REVOKE EXECUTE ON FUNCTION public.resolve_other_tags_on_deceased() FROM PUBLIC, anon, authenticated;
```

- [ ] **Step 3: Push the migration**

Run:

```bash
npx supabase db push
```

Expected: CLI reports the new migration applied with no errors.

- [ ] **Step 4: Update `lib/supabase/types.ts`**

In the `cat_tags` table type (currently `lib/supabase/types.ts:172-194`), add the two new columns to `Row`, `Insert`, and `Update`:

```ts
      cat_tags: {
        Row: {
          id: string
          cat_id: string
          tag: 'needs_medical' | 'possible_rabies' | 'deceased'
          added_by: string | null
          created_at: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?: string
          cat_id: string
          tag: 'needs_medical' | 'possible_rabies' | 'deceased'
          added_by?: string | null
          created_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          id?: string
          cat_id?: string
          tag?: 'needs_medical' | 'possible_rabies' | 'deceased'
          added_by?: string | null
          created_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
      }
```

- [ ] **Step 5: Type-check**

Run: `npm run type-check`
Expected: no errors (nothing consumes the new fields yet, so this just confirms the type edit is syntactically valid).

- [ ] **Step 6: Manual verification in the Supabase SQL editor is NOT allowed** (AGENTS.md forbids hand-editing via the dashboard). Instead verify via `psql`/CLI:

Run: `npx supabase migration list`
Expected: the new migration shows as applied both locally and remotely, no drift.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations lib/supabase/types.ts
git commit -m "feat(db): add tag resolution columns, RLS policies, and deceased cascade"
```

---

### Task 2: Rename "Deceased" to "Passed away"

**Files:**

- Modify: `lib/welfare-colors.ts:46-50`

**Interfaces:**

- Consumes: nothing new.
- Produces: `TAG_META.deceased.label === 'Passed away'` — consumed by `filter-sheet.tsx`, `cat-preview-card.tsx`, and the new `my-cats-list.tsx` (Task 8), all of which read `TAG_META` rather than hardcoding the string.

- [ ] **Step 1: Change the label**

In `lib/welfare-colors.ts`, change:

```ts
  deceased: {
    label: 'Deceased',
    icon: null,
    className: 'bg-secondary text-secondary-foreground',
  },
```

to:

```ts
  deceased: {
    label: 'Passed away',
    icon: null,
    className: 'bg-secondary text-secondary-foreground',
  },
```

- [ ] **Step 2: Lint and type-check**

Run: `npm run lint && npm run type-check`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run the dev server (`npm run dev`), open `/map`, open the filter sheet. Confirm the tag chip reads "Passed away" instead of "Deceased".

- [ ] **Step 4: Commit**

```bash
git add lib/welfare-colors.ts
git commit -m "fix(map): rename deceased tag label to 'Passed away'"
```

---

### Task 3: Extract a relative-time formatter in `lib/geo.ts`

**Files:**

- Modify: `lib/geo.ts:36-45`

**Interfaces:**

- Produces: `formatRelativeTime(iso: string): string` — returns `"just now"`, `"Xh ago"`, `"X day(s) ago"`, `"X week(s) ago"`, or `"over a month ago"` (no leading "Seen"). Consumed by `my-cats-list.tsx` (Task 8) for resolved/deceased badge captions (e.g. `"✓ Recovered 3 days ago"`, `"Passed away · 3 days ago"`).
- `formatLastSeen(createdAt: string): string` keeps its existing signature and output (`"Seen X ago"` etc.) — now implemented as a thin wrapper so the day/week thresholds live in one place.

- [ ] **Step 1: Replace `formatLastSeen` with a shared helper**

In `lib/geo.ts`, replace:

```ts
export function formatLastSeen(createdAt: string): string {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  if (ageMs < HOUR_MS) return 'Seen just now'
  if (ageMs < DAY_MS) return `Seen ${Math.floor(ageMs / HOUR_MS)}h ago`
  const days = Math.floor(ageMs / DAY_MS)
  if (days < 7) return `Seen ${days} day${days === 1 ? '' : 's'} ago`
  const weeks = Math.floor(days / 7)
  if (weeks > 4) return 'Seen over a month ago'
  return `Seen ${weeks} week${weeks === 1 ? '' : 's'} ago`
}
```

with:

```ts
// Same thresholds formatLastSeen uses, factored out so resolved/deceased
// tag badges (e.g. "✓ Recovered 3 days ago") can reuse the wording without
// the "Seen" prefix that only makes sense for a cat's own last-seen caption.
export function formatRelativeTime(iso: string): string {
  const ageMs = Date.now() - new Date(iso).getTime()
  if (ageMs < HOUR_MS) return 'just now'
  if (ageMs < DAY_MS) return `${Math.floor(ageMs / HOUR_MS)}h ago`
  const days = Math.floor(ageMs / DAY_MS)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  const weeks = Math.floor(days / 7)
  if (weeks > 4) return 'over a month ago'
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`
}

export function formatLastSeen(createdAt: string): string {
  return `Seen ${formatRelativeTime(createdAt)}`
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Open `/map`, tap any cat marker. Confirm the preview card's "Seen X ago" caption still reads exactly as before (e.g. "Seen 3h ago").

- [ ] **Step 4: Commit**

```bash
git add lib/geo.ts
git commit -m "refactor(geo): extract formatRelativeTime from formatLastSeen"
```

---

### Task 4: Export `matchesFilters` and add the deceased-exclusion rule

**Files:**

- Modify: `app/(app)/map/components/filter-sheet.tsx:18-22`

**Interfaces:**

- Produces: `matchesFilters(cat: NearbyCat, tags: CatTag['tag'][], filters: CatFilters): boolean`, now exported. Consumed by `map/page.tsx` (Task 5) to replace its own duplicated filter logic, so the deceased-exclusion rule can't drift between the two call sites.

- [ ] **Step 1: Export the function and add the exclusion rule**

In `app/(app)/map/components/filter-sheet.tsx`, change:

```ts
function matchesFilters(cat: NearbyCat, tags: CatTag['tag'][], filters: CatFilters): boolean {
  if (filters.earTippedOnly && !cat.is_ear_tipped) return false
  if (filters.tags.length > 0 && !filters.tags.some((tag) => tags.includes(tag))) return false
  return true
}
```

to:

```ts
// Exported so map/page.tsx's default-view filtering reuses this exact rule
// set — keeping the deceased-exclusion logic in one place is the point.
export function matchesFilters(
  cat: NearbyCat,
  tags: CatTag['tag'][],
  filters: CatFilters
): boolean {
  // A deceased cat is hidden from the default view; it only reappears when
  // the user explicitly opts in via the "Passed away" filter chip.
  if (tags.includes('deceased') && !filters.tags.includes('deceased')) return false
  if (filters.earTippedOnly && !cat.is_ear_tipped) return false
  if (filters.tags.length > 0 && !filters.tags.some((tag) => tags.includes(tag))) return false
  return true
}
```

- [ ] **Step 2: Lint and type-check**

Run: `npm run lint && npm run type-check`
Expected: no errors (the function is exported but not yet imported elsewhere until Task 5 — no unused-export lint rule is configured in this repo, so this is safe as an intermediate state).

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/map/components/filter-sheet.tsx"
git commit -m "refactor(map): export matchesFilters and hide deceased cats by default"
```

---

### Task 5: Map — filter resolved tags, reuse `matchesFilters`, wire up resolve

**Files:**

- Modify: `app/(app)/map/page.tsx:69-91` (tag fetch), `app/(app)/map/page.tsx:205-214` (filteredCats), `app/(app)/map/page.tsx:293-298` (CatPreviewCard render)

**Interfaces:**

- Consumes: `matchesFilters` from `./components/filter-sheet` (Task 4).
- Produces: `handleResolveTag(catId: string, tag: CatTag['tag']): Promise<void>` — passed as the new `onResolveTag` prop into `CatPreviewCard` (Task 6).

- [ ] **Step 1: Filter out resolved tags in the active-tag query**

In `app/(app)/map/page.tsx`, inside `fetchCats`, change:

```ts
const { data: tagRows, error: tagError } = await supabase
  .from('cat_tags')
  .select('cat_id, tag')
  .in(
    'cat_id',
    nearbyCats.map((cat: NearbyCat) => cat.id)
  )
```

to:

```ts
const { data: tagRows, error: tagError } = await supabase
  .from('cat_tags')
  .select('cat_id, tag')
  .in(
    'cat_id',
    nearbyCats.map((cat: NearbyCat) => cat.id)
  )
  .is('resolved_at', null)
```

- [ ] **Step 2: Reuse `matchesFilters` instead of the duplicated inline logic**

Add the import at the top of the file:

```ts
import { FilterSheet, type CatFilters, matchesFilters } from './components/filter-sheet'
```

(replacing the existing `import { FilterSheet, type CatFilters } from './components/filter-sheet'` line).

Then replace:

```ts
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
```

with:

```ts
const filteredCats = useMemo(() => {
  return cats.filter((cat) => matchesFilters(cat, catTags.get(cat.id) ?? [], filters))
}, [cats, filters, catTags])
```

- [ ] **Step 3: Add the resolve handler**

Add this function next to `handleApplyFilters`:

```ts
async function handleResolveTag(catId: string, tag: CatTag['tag']) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const prevTags = catTags.get(catId) ?? []
  setCatTags((prev) =>
    new Map(prev).set(
      catId,
      prevTags.filter((t) => t !== tag)
    )
  )

  const { error } = await supabase
    .from('cat_tags')
    .update({ resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq('cat_id', catId)
    .eq('tag', tag)
    .is('resolved_at', null)

  if (error) {
    setCatTags((prev) => new Map(prev).set(catId, prevTags))
    toast.error(error.message)
  }
}
```

- [ ] **Step 4: Pass the handler down to `CatPreviewCard`**

Change:

```tsx
<CatPreviewCard
  cat={selectedCat}
  tags={selectedCat ? (catTags.get(selectedCat.id) ?? []) : []}
  onClose={() => setSelectedCatId(null)}
  onViewLocation={(lat, lng) => setFlyToTarget([lat, lng])}
/>
```

to:

```tsx
<CatPreviewCard
  cat={selectedCat}
  tags={selectedCat ? (catTags.get(selectedCat.id) ?? []) : []}
  onClose={() => setSelectedCatId(null)}
  onViewLocation={(lat, lng) => setFlyToTarget([lat, lng])}
  onResolveTag={handleResolveTag}
/>
```

- [ ] **Step 5: Type-check**

Run: `npm run type-check`
Expected: an error at the `CatPreviewCard` usage saying `onResolveTag` doesn't exist on the props type — expected until Task 6 updates `cat-preview-card.tsx`. Confirm this is the _only_ new error before moving on.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/map/page.tsx"
git commit -m "feat(map): filter resolved tags, dedupe filter logic, add resolve handler"
```

---

### Task 6: `cat-preview-card.tsx` — resolve action for active medical/rabies tags

**Files:**

- Modify: `app/(app)/map/components/cat-preview-card.tsx`

**Interfaces:**

- Consumes: `onResolveTag(catId: string, tag: CatTag['tag']): void` prop from `map/page.tsx` (Task 5).
- Produces: nothing new for other files — this is a leaf UI change.

- [ ] **Step 1: Add the `onResolveTag` prop and a local resolve handler**

Change the function signature:

```ts
export function CatPreviewCard({
  cat,
  tags,
  onClose,
  onViewLocation,
}: {
  cat: NearbyCat | null
  tags: CatTag['tag'][]
  onClose: () => void
  onViewLocation: (lat: number, lng: number) => void
}) {
```

to:

```ts
export function CatPreviewCard({
  cat,
  tags,
  onClose,
  onViewLocation,
  onResolveTag,
}: {
  cat: NearbyCat | null
  tags: CatTag['tag'][]
  onClose: () => void
  onViewLocation: (lat: number, lng: number) => void
  onResolveTag: (catId: string, tag: CatTag['tag']) => void
}) {
```

Add `Check` to the lucide-react import:

```ts
import { Clock, Eye, Images, MapPin, Scissors, X } from 'lucide-react'
```

becomes:

```ts
import { Check, Clock, Eye, Images, MapPin, Scissors, X } from 'lucide-react'
```

After the existing `handleViewLocation` function, add:

```ts
// The card freezes `tags` into `renderedTags` on cat-identity change only
// (see the effect above), so a resolve here needs its own local update —
// otherwise the chip wouldn't disappear until the card is closed and
// reopened, even though the parent's source-of-truth state did update.
function handleResolve(tag: CatTag['tag']) {
  setRenderedTags((prev) => prev.filter((t) => t !== tag))
  onResolveTag(renderedCat.id, tag)
}
```

- [ ] **Step 2: Render resolvable tags as buttons**

Replace:

```tsx
{
  renderedTags.map((tag) => {
    const meta = TAG_META[tag]
    const Icon = meta.icon
    return (
      <span
        key={tag}
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase',
          meta.className
        )}
      >
        {Icon && <Icon className="h-2.5 w-2.5" />}
        {meta.label}
      </span>
    )
  })
}
```

with:

```tsx
{
  renderedTags.map((tag) => {
    const meta = TAG_META[tag]
    const Icon = meta.icon
    // Deceased-cascade already auto-resolves needs_medical/possible_rabies,
    // so an active deceased tag alongside them shouldn't occur — this
    // guard is defensive, matching the design doc's disabling rule.
    const resolvable =
      (tag === 'needs_medical' || tag === 'possible_rabies') && !renderedTags.includes('deceased')

    if (!resolvable) {
      return (
        <span
          key={tag}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase',
            meta.className
          )}
        >
          {Icon && <Icon className="h-2.5 w-2.5" />}
          {meta.label}
        </span>
      )
    }

    return (
      <button
        key={tag}
        type="button"
        aria-label={tag === 'needs_medical' ? 'Mark as recovered' : 'Mark as cleared'}
        onClick={() => handleResolve(tag)}
        className={cn(
          'inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase transition-opacity hover:opacity-70',
          meta.className
        )}
      >
        {Icon && <Icon className="h-2.5 w-2.5" />}
        {meta.label}
        <Check className="h-2.5 w-2.5" />
      </button>
    )
  })
}
```

- [ ] **Step 3: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: no errors — the Task 5 error from the previous task's step 5 should now be gone.

- [ ] **Step 4: Manual verification**

1. Via `/tag`, tag a cat `needs_medical`.
2. On `/map`, open that cat's preview card as a _different_ signed-in user (or the same one — resolving is unilateral either way). Confirm the "Needs medical" chip renders as a tappable button with a checkmark.
3. Tap it. Confirm the chip disappears from the card immediately and the map marker's welfare color/badge reverts to default without needing to close/reopen the card.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/map/components/cat-preview-card.tsx"
git commit -m "feat(map): let any signed-in user resolve a cat's welfare tag"
```

---

### Task 7: `/profile/me` — fetch the user's cats, tags, and sighting counts

**Files:**

- Modify: `app/(app)/profile/me/page.tsx`

**Interfaces:**

- Produces: `<MyCatsList cats={...} initialTags={...} currentUserId={user.id} />` render — consumed by Task 8's component (created in that task).

- [ ] **Step 1: Extend the query and render the new component**

Replace the full file content:

```tsx
import { redirect } from 'next/navigation'
import { User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from './components/sign-out-button'
import { ThemeToggle } from './components/theme-toggle'
import { MyCatsList } from './components/my-cats-list'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url, bio')
    .eq('id', user.id)
    .single()

  const initials = profile?.username ? profile.username.slice(0, 2).toUpperCase() : null

  const { data: myCats } = await supabase
    .from('cats')
    .select('id, name, primary_photo_url, created_at')
    .eq('tagged_by', user.id)
    .order('created_at', { ascending: false })

  const catIds = (myCats ?? []).map((cat) => cat.id)

  const [{ data: tagRows }, { data: sightingRows }] =
    catIds.length > 0
      ? await Promise.all([
          supabase.from('cat_tags').select('*').in('cat_id', catIds),
          supabase.from('sightings').select('cat_id').in('cat_id', catIds),
        ])
      : [{ data: [] }, { data: [] }]

  const sightingCounts = new Map<string, number>()
  for (const row of sightingRows ?? []) {
    sightingCounts.set(row.cat_id, (sightingCounts.get(row.cat_id) ?? 0) + 1)
  }

  const cats = (myCats ?? []).map((cat) => ({
    ...cat,
    // Same formula nearby_cats() uses: the tagging itself counts as sighting 1.
    timesSpotted: 1 + (sightingCounts.get(cat.id) ?? 0),
  }))

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center gap-6 px-4 py-6 text-center">
      <div className="flex w-full justify-end">
        <ThemeToggle />
      </div>

      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatar_url}
          alt={profile.username}
          className="border-border h-24 w-24 rounded-full border object-cover"
        />
      ) : (
        <div className="bg-primary text-primary-foreground flex h-24 w-24 items-center justify-center rounded-full text-2xl font-semibold">
          {initials ?? <User className="h-10 w-10" />}
        </div>
      )}

      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {profile?.username ? `@${profile.username}` : 'Your profile'}
        </h1>
        {profile?.bio && <p className="text-muted-foreground text-sm">{profile.bio}</p>}
      </div>

      <SignOutButton />

      <div className="w-full text-left">
        <h2 className="font-heading mb-3 text-lg font-bold tracking-tight">My Cats</h2>
        <MyCatsList cats={cats} initialTags={tagRows ?? []} currentUserId={user.id} />
      </div>
    </div>
  )
}
```

Note: `items-center justify-center` on the outer div is changed to `items-center` (dropping `justify-center`) — with a variable-length cat list below, centering the whole page vertically would push content off-screen on longer lists.

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: an error that `./components/my-cats-list` doesn't exist yet — expected until Task 8. Confirm no other new errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/profile/me/page.tsx"
git commit -m "feat(profile): fetch tagged cats, tags, and sighting counts for My Cats"
```

---

### Task 8: `my-cats-list.tsx` — the component

**Files:**

- Create: `app/(app)/profile/me/components/my-cats-list.tsx`

**Interfaces:**

- Consumes: `formatLastSeen`, `formatRelativeTime` from `@/lib/geo` (Task 3); `TAG_META` from `@/lib/welfare-colors` (Task 2); `CatTag` from `@/lib/supabase/types` (Task 1); `buttonVariants` from `@/components/ui/button`.
- Consumes props from `app/(app)/profile/me/page.tsx` (Task 7): `cats: { id: string; name: string | null; primary_photo_url: string; created_at: string; timesSpotted: number }[]`, `initialTags: CatTag[]`, `currentUserId: string`.

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock, Eye } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatLastSeen, formatRelativeTime } from '@/lib/geo'
import { TAG_META } from '@/lib/welfare-colors'
import type { CatTag } from '@/lib/supabase/types'

type MyCat = {
  id: string
  name: string | null
  primary_photo_url: string
  created_at: string
  timesSpotted: number
}

const TAG_ORDER: CatTag['tag'][] = ['needs_medical', 'possible_rabies', 'deceased']

const RESOLVE_LABEL: Record<CatTag['tag'], string> = {
  needs_medical: 'Recovered',
  possible_rabies: 'Cleared',
  deceased: '', // deceased never resolves — only hard-deleted, see the delete branch below
}

export function MyCatsList({
  cats,
  initialTags,
  currentUserId,
}: {
  cats: MyCat[]
  initialTags: CatTag[]
  currentUserId: string
}) {
  const [tagsByCat, setTagsByCat] = useState<Map<string, CatTag[]>>(() => {
    const map = new Map<string, CatTag[]>()
    for (const row of initialTags) {
      map.set(row.cat_id, [...(map.get(row.cat_id) ?? []), row])
    }
    return map
  })

  function setCatTags(catId: string, tags: CatTag[]) {
    setTagsByCat((prev) => new Map(prev).set(catId, tags))
  }

  async function handleInsertTag(catId: string, tag: CatTag['tag']) {
    const prevTags = tagsByCat.get(catId) ?? []
    const optimisticId = `optimistic-${tag}`
    setCatTags(catId, [
      ...prevTags,
      {
        id: optimisticId,
        cat_id: catId,
        tag,
        added_by: currentUserId,
        created_at: new Date().toISOString(),
        resolved_at: null,
        resolved_by: null,
      },
    ])

    const supabase = createClient()
    const { data, error } = await supabase
      .from('cat_tags')
      .insert({ cat_id: catId, tag, added_by: currentUserId })
      .select()
      .single()

    if (error || !data) {
      setCatTags(catId, prevTags)
      toast.error(error?.message ?? 'Could not add tag')
      return
    }

    setCatTags(
      catId,
      (tagsByCat.get(catId) ?? []).map((row) => (row.id === optimisticId ? data : row))
    )
  }

  async function handleResolveTag(catId: string, tag: CatTag['tag']) {
    const prevTags = tagsByCat.get(catId) ?? []
    const now = new Date().toISOString()
    setCatTags(
      catId,
      prevTags.map((row) =>
        row.tag === tag ? { ...row, resolved_at: now, resolved_by: currentUserId } : row
      )
    )

    const supabase = createClient()
    const { error } = await supabase
      .from('cat_tags')
      .update({ resolved_at: now, resolved_by: currentUserId })
      .eq('cat_id', catId)
      .eq('tag', tag)
      .is('resolved_at', null)

    if (error) {
      setCatTags(catId, prevTags)
      toast.error(error.message)
    }
  }

  async function handleDeleteTag(catId: string, tag: CatTag['tag']) {
    const prevTags = tagsByCat.get(catId) ?? []
    setCatTags(
      catId,
      prevTags.filter((row) => row.tag !== tag)
    )

    const supabase = createClient()
    const { error } = await supabase.from('cat_tags').delete().eq('cat_id', catId).eq('tag', tag)

    if (error) {
      setCatTags(catId, prevTags)
      toast.error(error.message)
    }
  }

  if (cats.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="text-muted-foreground text-sm">You haven&apos;t tagged any cats yet</p>
        <Link href="/tag" className={cn(buttonVariants(), 'w-full')}>
          Tag a cat
        </Link>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {cats.map((cat) => {
        const tags = tagsByCat.get(cat.id) ?? []
        const deceasedActive = tags.some((row) => row.tag === 'deceased' && !row.resolved_at)

        return (
          <Card key={cat.id} className="flex-row items-center gap-3 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cat.primary_photo_url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1 text-left">
              <p className="font-heading truncate text-base font-bold">
                {cat.name ?? 'Unnamed cat'}
              </p>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Spotted {cat.timesSpotted} time{cat.timesSpotted === 1 ? '' : 's'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatLastSeen(cat.created_at)}
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap gap-1">
                {TAG_ORDER.map((tag) => {
                  const row = tags.find((t) => t.tag === tag)
                  const meta = TAG_META[tag]
                  const Icon = meta.icon
                  // Once deceased is active, no point flagging new medical
                  // concern for a cat already marked dead.
                  const disabled = tag !== 'deceased' && deceasedActive

                  if (row && !row.resolved_at) {
                    const label =
                      tag === 'deceased'
                        ? `${meta.label} · ${formatRelativeTime(row.created_at)}`
                        : meta.label
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          tag === 'deceased'
                            ? handleDeleteTag(cat.id, tag)
                            : handleResolveTag(cat.id, tag)
                        }
                        className={cn(
                          'inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase transition-opacity hover:opacity-70',
                          meta.className
                        )}
                      >
                        {Icon && <Icon className="h-2.5 w-2.5" />}
                        {label}
                      </button>
                    )
                  }

                  if (row && row.resolved_at) {
                    return (
                      <span
                        key={tag}
                        className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase"
                      >
                        ✓ {RESOLVE_LABEL[tag]} {formatRelativeTime(row.resolved_at)}
                      </span>
                    )
                  }

                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleInsertTag(cat.id, tag)}
                      className={cn(
                        'text-muted-foreground border-border inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                        disabled
                          ? 'cursor-not-allowed opacity-40'
                          : 'cursor-pointer hover:border-current'
                      )}
                    >
                      {Icon && <Icon className="h-2.5 w-2.5" />}
                      {meta.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: no errors — the Task 7 error from that task's step 2 should now be gone.

- [ ] **Step 3: Manual verification**

1. Visit `/profile/me` with a user who has never tagged a cat. Confirm the empty state renders with a working "Tag a cat" link to `/tag`.
2. Tag a cat via `/tag`, revisit `/profile/me`. Confirm it appears with photo, name, "Spotted N times", last-seen caption, and three untagged (outline) chips.
3. Tap "Needs medical" (outline chip) — confirm it becomes a filled destructive chip immediately (optimistic), and persists after a page refresh.
4. Tap the now-active "Needs medical" chip — confirm it becomes a muted "✓ Recovered just now" badge, non-interactive, and persists after refresh.
5. Tap "Passed away" (outline chip) on a cat with an active "Needs medical" tag re-added — confirm the medical chip auto-resolves (cascade) and both medical/rabies chips become disabled (grayed, unclickable) while deceased is active.
6. As the cat's owner, tap the active "Passed away" chip — confirm it hard-deletes (row disappears, chips return to untagged state, medical/rabies chips re-enable).

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/profile/me/components/my-cats-list.tsx"
git commit -m "feat(profile): add My Cats list with tag insert/resolve/delete"
```

---

### Task 9: End-to-end verification against the spec

**Files:** none (verification only)

- [ ] **Step 1: Full build**

Run: `npm run format:check && npm run lint && npm run type-check && npm run build`
Expected: all four pass with no errors.

- [ ] **Step 2: Walk through the spec's verification list**

With the dev server running (`npm run dev`) and at least two test user accounts:

1. Tag a cat via `/tag` with `needs_medical`. Confirm it appears active in both the My Cats list and the map's `cat-preview-card`.
2. As a _different_ signed-in user (not the owner or original tagger), resolve the `needs_medical` tag from the map card. Confirm it shows resolved and the cat's welfare tier/badge on the map reverts to default.
3. On the My Cats list, hard-delete a mistakenly-added tag as the owner. Confirm a non-owner without adder rights cannot do the same (RLS blocks it — expect a 403-style Postgres error surfaced via `toast.error`).
4. Tag a cat `deceased` while it has an active `needs_medical` tag. Confirm the medical tag auto-resolves and both chips for `needs_medical`/`possible_rabies` become disabled.
5. Confirm a `deceased` cat is hidden from the default map view, and reappears only when the "Passed away" filter chip is checked.
6. Confirm the deceased label reads "Passed away" everywhere it appears (map card, filter sheet, My Cats list), with a relative-time caption in the My Cats list.
7. Confirm the empty state and its `/tag` CTA render for a user with no tagged cats.

- [ ] **Step 3: Final commit (if any fixups were needed)**

```bash
git add -A
git commit -m "fix: address issues found in end-to-end verification"
```

(Skip this step if no fixes were needed.)
