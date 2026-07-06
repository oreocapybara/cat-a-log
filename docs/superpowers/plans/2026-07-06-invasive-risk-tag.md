# Invasive Risk Tag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a community-verified "Invasive risk" ecological tag to the cat tagging system, with a vote-based verification flow.

**Architecture:** Extend `cat_tags` with a new allowed value and `verification_status` column. Create a separate `invasive_risk_votes` table for community voting. An AFTER INSERT trigger auto-resolves the tag when vote thresholds are met. UI surfaces gain a new ecological flags group and vote prompts.

**Tech Stack:** PostgreSQL (Supabase), TypeScript, Next.js 16 App Router, React Hook Form + Zod, Tailwind CSS v4, shadcn/ui, Lucide React

## Global Constraints

- Next.js 16.2.10 — read `node_modules/next/dist/docs/` before using uncertain APIs
- TypeScript strict mode
- All DB changes via `supabase/migrations/` only
- Update `lib/supabase/types.ts` by hand after schema changes
- Conventional Commits
- Mobile-first, max-w-sm on forms
- RLS on all new tables
- SECURITY DEFINER + pinned search_path for trigger functions
- The `deceased` auto-resolve trigger must NOT resolve `invasive_risk` tags

---

### Task 1: Database Migration — Extend `cat_tags` and Create `invasive_risk_votes`

**Files:**

- Create: `supabase/migrations/YYYYMMDDHHMMSS_invasive_risk_tag.sql`
- Modify: `lib/supabase/types.ts`

**Interfaces:**

- Produces: `cat_tags.tag` now accepts `'invasive_risk'`; `cat_tags.verification_status` column (`'pending' | 'verified' | 'dismissed' | null`); `invasive_risk_votes` table; `update_invasive_risk_status()` trigger function

- [ ] **Step 1: Create migration file**

```bash
npx supabase migration new invasive_risk_tag
```

- [ ] **Step 2: Write the migration SQL**

In the generated file:

```sql
-- ============================================================
-- INVASIVE RISK TAG
-- Adds 'invasive_risk' to cat_tags vocabulary, verification_status
-- column, invasive_risk_votes table, auto-resolve trigger, and
-- updates the deceased cascade to skip invasive_risk.
-- ============================================================

-- 1. Extend CHECK constraint
ALTER TABLE cat_tags DROP CONSTRAINT cat_tags_tag_check;
ALTER TABLE cat_tags ADD CONSTRAINT cat_tags_tag_check
  CHECK (tag IN ('needs_medical', 'possible_rabies', 'deceased', 'invasive_risk'));

-- 2. Add verification_status (NULL for medical tags)
ALTER TABLE cat_tags ADD COLUMN verification_status text
  CHECK (verification_status IS NULL OR verification_status IN ('pending', 'verified', 'dismissed'));

-- 3. Create votes table
CREATE TABLE invasive_risk_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_tag_id  uuid NOT NULL REFERENCES cat_tags(id) ON DELETE CASCADE,
  voted_by    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote        text NOT NULL CHECK (vote IN ('confirm', 'deny')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cat_tag_id, voted_by)
);

ALTER TABLE invasive_risk_votes ENABLE ROW LEVEL SECURITY;

-- 4. RLS for invasive_risk_votes
CREATE POLICY "Invasive risk votes are publicly readable"
  ON invasive_risk_votes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote on invasive risk"
  ON invasive_risk_votes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = voted_by);

-- No UPDATE or DELETE policies — votes are immutable

-- 5. Auto-resolve trigger: counts votes and updates verification_status
CREATE OR REPLACE FUNCTION public.update_invasive_risk_status()
RETURNS trigger AS $$
DECLARE
  confirm_count int;
  deny_count int;
BEGIN
  SELECT
    count(*) FILTER (WHERE vote = 'confirm'),
    count(*) FILTER (WHERE vote = 'deny')
  INTO confirm_count, deny_count
  FROM public.invasive_risk_votes
  WHERE cat_tag_id = NEW.cat_tag_id;

  IF confirm_count >= 3 THEN
    UPDATE public.cat_tags SET verification_status = 'verified'
    WHERE id = NEW.cat_tag_id AND verification_status = 'pending';
  ELSIF deny_count >= 3 THEN
    UPDATE public.cat_tags SET verification_status = 'dismissed'
    WHERE id = NEW.cat_tag_id AND verification_status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER invasive_risk_votes_after_insert
  AFTER INSERT ON invasive_risk_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invasive_risk_status();

REVOKE EXECUTE ON FUNCTION public.update_invasive_risk_status() FROM PUBLIC, anon, authenticated;

-- 6. Update deceased cascade to skip invasive_risk
CREATE OR REPLACE FUNCTION public.resolve_other_tags_on_deceased()
RETURNS trigger AS $$
BEGIN
  UPDATE public.cat_tags
  SET resolved_at = now(), resolved_by = NEW.added_by
  WHERE cat_id = NEW.cat_id
    AND tag <> 'deceased'
    AND tag <> 'invasive_risk'
    AND resolved_at IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 7. Guard existing resolve/delete policies for verified invasive tags
-- Drop and recreate the UPDATE policy with the guard
DROP POLICY "Authenticated users can resolve cat tags" ON cat_tags;
CREATE POLICY "Authenticated users can resolve cat tags"
  ON cat_tags FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (
    auth.role() = 'authenticated'
    AND resolved_by = auth.uid()
    AND NOT (tag = 'invasive_risk' AND verification_status = 'verified')
  );

-- Drop and recreate DELETE policies with guards
DROP POLICY "Tag adder can remove their own tag" ON cat_tags;
CREATE POLICY "Tag adder can remove their own tag"
  ON cat_tags FOR DELETE USING (
    auth.uid() = added_by
    AND NOT (tag = 'invasive_risk' AND verification_status = 'verified')
  );

DROP POLICY "Cat owner can remove tags on their own cat" ON cat_tags;
CREATE POLICY "Cat owner can remove tags on their own cat"
  ON cat_tags FOR DELETE USING (
    auth.uid() = (SELECT tagged_by FROM public.cats WHERE id = cat_tags.cat_id)
    AND NOT (tag = 'invasive_risk' AND verification_status = 'verified')
  );
```

- [ ] **Step 3: Update TypeScript types**

In `lib/supabase/types.ts`, update the `cat_tags` table type:

```typescript
// In cat_tags Row/Insert/Update — change the tag union:
tag: 'needs_medical' | 'possible_rabies' | 'deceased' | 'invasive_risk'

// Add to Row:
verification_status: 'pending' | 'verified' | 'dismissed' | null

// Add to Insert:
verification_status?: 'pending' | 'verified' | 'dismissed' | null

// Add to Update:
verification_status?: 'pending' | 'verified' | 'dismissed' | null
```

Add the new table after `cat_tags`:

```typescript
invasive_risk_votes: {
  Row: {
    id: string
    cat_tag_id: string
    voted_by: string
    vote: 'confirm' | 'deny'
    created_at: string
  }
  Insert: {
    id?: string
    cat_tag_id: string
    voted_by: string
    vote: 'confirm' | 'deny'
    created_at?: string
  }
  Update: {
    id?: string
    cat_tag_id?: string
    voted_by?: string
    vote?: 'confirm' | 'deny'
    created_at?: string
  }
}
```

Add convenience type at the bottom:

```typescript
export type InvasiveRiskVote = Database['public']['Tables']['invasive_risk_votes']['Row']
```

- [ ] **Step 4: Push migration to remote**

```bash
npx supabase db push
```

Expected: Migration applied successfully, no errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/ lib/supabase/types.ts
git commit -m "feat(db): add invasive_risk tag with community verification schema"
```

---

### Task 2: Extend `welfare-colors.ts` and Tag Metadata

**Files:**

- Modify: `lib/welfare-colors.ts`

**Interfaces:**

- Consumes: Updated `CatTag['tag']` type from Task 1
- Produces: `TAG_META['invasive_risk']` entry; updated `WELFARE_TIERS` with invasive_risk tier

- [ ] **Step 1: Add invasive_risk to TAG_META**

In `lib/welfare-colors.ts`, add the import for `Leaf`:

```typescript
import { Cross, Leaf, TriangleAlert } from 'lucide-react'
```

Add to the `TAG_META` record after `deceased`:

```typescript
invasive_risk: {
  label: 'Invasive risk',
  icon: Leaf,
  className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400',
},
```

- [ ] **Step 2: Add invasive_risk to WELFARE_TIERS**

Add before the `deceased` tier (lower priority than medical, higher than deceased):

```typescript
{ tag: 'invasive_risk', color: '#16a34a', glyph: '🌿', desaturate: false },
```

The full array becomes:

```typescript
const WELFARE_TIERS: WelfareTier[] = [
  { tag: 'needs_medical', color: '#dc2626', glyph: '+', desaturate: false },
  { tag: 'possible_rabies', color: '#b45309', glyph: '!', desaturate: false },
  { tag: 'invasive_risk', color: '#16a34a', glyph: '🌿', desaturate: false },
  { tag: 'deceased', color: '#9ca3af', glyph: '', desaturate: true },
]
```

- [ ] **Step 3: Verify type-check passes**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/welfare-colors.ts
git commit -m "feat(tag): add invasive_risk to welfare tier and tag metadata"
```

### Task 3: Details Screen — Add Ecological Flags Group

**Files:**

- Modify: `app/(app)/tag/components/details-screen.tsx`

**Interfaces:**

- Consumes: Updated `CatTag['tag']` type from Task 1
- Produces: Users can select `invasive_risk` during the catch flow; form value includes it in `tags` array

- [ ] **Step 1: Add ecological tags constant**

After the existing `MEDICAL_TAGS` array, add:

```typescript
const ECOLOGICAL_TAGS = [
  { value: 'invasive_risk', label: 'Invasive risk', icon: Leaf, color: 'green' },
] as const
```

Add `Leaf` to the Lucide import:

```typescript
import {
  Scissors,
  AlertTriangle,
  PawPrint,
  ArrowLeft,
  Check,
  Sparkles,
  Stethoscope,
  Skull,
  Leaf,
} from 'lucide-react'
```

- [ ] **Step 2: Add ecological flags section to the form**

After the existing "Health flags" card section, add a new card:

```tsx
{
  /* Ecological flags — Pill selectors */
}
;<div className="bg-card/80 ring-border space-y-3 rounded-2xl p-4 ring-1 backdrop-blur-sm">
  <div className="flex items-center gap-2">
    <Leaf className="text-muted-foreground h-3.5 w-3.5" />
    <span className="text-sm font-semibold">Ecological flags</span>
  </div>
  <Controller
    control={control}
    name="tags"
    render={({ field }) => (
      <div className="flex flex-wrap gap-2">
        {ECOLOGICAL_TAGS.map((tag) => {
          const isChecked = field.value.includes(tag.value)
          return (
            <button
              key={tag.value}
              type="button"
              onClick={() => {
                field.onChange(
                  isChecked
                    ? field.value.filter((v) => v !== tag.value)
                    : [...field.value, tag.value]
                )
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium ring-1 transition-all duration-200 active:scale-95',
                isChecked
                  ? 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-950/30 dark:text-green-300 dark:ring-green-700/50'
                  : 'bg-muted/50 text-muted-foreground ring-border hover:bg-muted'
              )}
            >
              <tag.icon className="h-4 w-4" />
              <span>{tag.label}</span>
              {isChecked && <Check className="h-3 w-3" />}
            </button>
          )
        })}
      </div>
    )}
  />
  <p className="text-muted-foreground text-xs">
    Flag if this cat is hunting native wildlife or frequenting a sensitive habitat.
  </p>
</div>
```

- [ ] **Step 3: Update the summary preview**

In the summary section where `selectedTags` are rendered, update the label lookup to also check `ECOLOGICAL_TAGS`:

```typescript
{
  selectedTags
    .map(
      (t) =>
        MEDICAL_TAGS.find((mt) => mt.value === t)?.label ??
        ECOLOGICAL_TAGS.find((et) => et.value === t)?.label ??
        t
    )
    .join(', ')
}
```

- [ ] **Step 4: Verify type-check and build**

```bash
npm run type-check
npm run build
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/tag/components/details-screen.tsx
git commit -m "feat(tag): add ecological flags group with invasive_risk to details screen"
```

---

### Task 4: Match-Found Screen — Add Ecological Tag Support

**Files:**

- Modify: `app/(app)/tag/components/match-found-screen.tsx`

**Interfaces:**

- Consumes: Updated `CatTag['tag']` type from Task 1
- Produces: Users can add `invasive_risk` tag during re-sighting; tag is displayed on matched cats

- [ ] **Step 1: Add invasive_risk to TAG_LABELS and MEDICAL_TAGS**

Update the `TAG_LABELS` constant:

```typescript
const TAG_LABELS: Record<string, { label: string; emoji: string }> = {
  needs_medical: { label: 'Needs medical', emoji: '🩺' },
  possible_rabies: { label: 'Possible rabies', emoji: '⚠️' },
  deceased: { label: 'Passed away', emoji: '🕊️' },
  invasive_risk: { label: 'Invasive risk', emoji: '🌿' },
}
```

Add an `ECOLOGICAL_TAGS` constant after `MEDICAL_TAGS`:

```typescript
const ECOLOGICAL_TAGS = [
  { value: 'invasive_risk', label: 'Invasive risk', emoji: '🌿', color: 'green' },
] as const
```

- [ ] **Step 2: Add ecological flags section to the edit form**

After the "Health flags" section in the community editing area, add:

```tsx
{
  /* Ecological flags */
}
{
  availableEcoTags.length > 0 && (
    <div className="bg-card/80 ring-border space-y-3 rounded-2xl p-4 ring-1 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Leaf className="text-muted-foreground h-3.5 w-3.5" />
        <span className="text-sm font-semibold">Ecological flags</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {availableEcoTags.map((tag) => {
          const isChecked = selectedNewTags.includes(tag.value)
          return (
            <button
              key={tag.value}
              type="button"
              onClick={() => toggleNewTag(tag.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium ring-1 transition-all duration-200 active:scale-95',
                isChecked
                  ? 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-950/30 dark:text-green-300 dark:ring-green-700/50'
                  : 'bg-muted/50 text-muted-foreground ring-border hover:bg-muted'
              )}
            >
              <span className="text-base leading-none">{tag.emoji}</span>
              <span>{tag.label}</span>
              {isChecked && <Check className="h-3 w-3" />}
            </button>
          )
        })}
      </div>
      <p className="text-muted-foreground text-xs">
        Flag if this cat is hunting native wildlife or frequenting a sensitive habitat.
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Add the `availableEcoTags` filter**

After `availableTags`:

```typescript
const availableEcoTags = ECOLOGICAL_TAGS.filter((t) => !activeTagValues.includes(t.value))
```

Add `Leaf` to the Lucide import.

- [ ] **Step 4: Handle verification_status on insert**

In the `handleSaveEdits` function, when inserting tags, set `verification_status` for invasive_risk:

```typescript
if (selectedNewTags.length > 0) {
  const { error } = await supabase.from('cat_tags').insert(
    selectedNewTags.map((tag) => ({
      cat_id: cat.id,
      tag,
      added_by: user.id,
      ...(tag === 'invasive_risk' ? { verification_status: 'pending' } : {}),
    }))
  )

  if (error) {
    toast.error('Could not add tags.')
    setSavingEdit(false)
    return
  }

  // Auto-insert first confirm vote for invasive_risk
  const invasiveTag = selectedNewTags.find((t) => t === 'invasive_risk')
  if (invasiveTag) {
    // Fetch the just-inserted cat_tag id
    const { data: tagRow } = await supabase
      .from('cat_tags')
      .select('id')
      .eq('cat_id', cat.id)
      .eq('tag', 'invasive_risk')
      .is('resolved_at', null)
      .single()

    if (tagRow) {
      await supabase.from('invasive_risk_votes').insert({
        cat_tag_id: tagRow.id,
        voted_by: user.id,
        vote: 'confirm',
      })
    }
  }
}
```

- [ ] **Step 5: Update tag display to handle invasive_risk styling**

In the status badges section where tags are displayed, use the `TAG_LABELS` lookup (which already includes `invasive_risk`). Add conditional green styling:

```typescript
{tags.map((tag) => {
  const info = TAG_LABELS[tag.tag] ?? { label: tag.tag, emoji: '🏷️' }
  const isInvasive = tag.tag === 'invasive_risk'
  return (
    <span
      key={tag.id}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
        isInvasive
          ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400'
          : 'bg-destructive/10 text-destructive'
      )}
    >
      {info.emoji} {info.label}
      {isInvasive && tag.verification_status === 'pending' && (
        <span className="ml-1 opacity-60">⏳</span>
      )}
      {isInvasive && tag.verification_status === 'verified' && (
        <span className="ml-1">✓</span>
      )}
    </span>
  )
})}
```

- [ ] **Step 6: Verify type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add app/(app)/tag/components/match-found-screen.tsx
git commit -m "feat(tag): add invasive_risk support to match-found screen"
```

---

### Task 5: Map Surfaces — Filter Sheet and Preview Card

**Files:**

- Modify: `app/(app)/map/components/filter-sheet.tsx`
- Modify: `app/(app)/map/components/cat-preview-card.tsx`

**Interfaces:**

- Consumes: `TAG_META['invasive_risk']` from Task 2; updated `CatTag['tag']` type
- Produces: Map filter supports invasive_risk; preview card renders the tag with pending/verified styling

- [ ] **Step 1: Filter sheet — no code changes needed**

The filter sheet already iterates `Object.entries(TAG_META)` to build its pill list. Since Task 2 added `invasive_risk` to `TAG_META`, it will automatically appear as a filter option.

Verify by checking that the `TAG_OPTIONS` line works:

```typescript
const TAG_OPTIONS = Object.entries(TAG_META) as [CatTag['tag'], (typeof TAG_META)[CatTag['tag']]][]
```

This will now include the `invasive_risk` entry. ✓

- [ ] **Step 2: Filter sheet — update `matchesFilters` for dismissed tags**

The `matchesFilters` function hides deceased cats from default view. Add similar logic for dismissed invasive_risk tags. However, the map page currently only stores `CatTag['tag'][]` (not the full row with `verification_status`). This means the map page query needs to be updated to exclude dismissed tags.

In `app/(app)/map/page.tsx`, the tag fetch query already filters `.is('resolved_at', null)`. Add an additional filter to exclude dismissed:

```typescript
const { data: tagRows, error: tagError } = await supabase
  .from('cat_tags')
  .select('cat_id, tag')
  .in(
    'cat_id',
    nearbyCats.map((cat: NearbyCat) => cat.id)
  )
  .is('resolved_at', null)
  .or('verification_status.is.null,verification_status.neq.dismissed')
```

- [ ] **Step 3: Preview card — update resolvable logic**

In `cat-preview-card.tsx`, the `resolvable` variable determines which tags show a resolve/check button. Update it to also prevent resolving verified invasive tags:

The current logic:

```typescript
const resolvable =
  (tag === 'needs_medical' || tag === 'possible_rabies') && !renderedTags.includes('deceased')
```

This already excludes `invasive_risk` and `deceased` from being resolvable (only `needs_medical` and `possible_rabies` are in the allowlist). No change needed for the basic case.

However, we want pending invasive tags to show a "pending" badge. The preview card currently receives `tags: CatTag['tag'][]` which doesn't carry verification_status. For now, pending/verified badge display will be handled in Task 7 (dedicated vote UI component). The preview card just shows the pill with `TAG_META` styling which already works from Task 2.

- [ ] **Step 4: Verify type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/map/page.tsx app/(app)/map/components/filter-sheet.tsx app/(app)/map/components/cat-preview-card.tsx
git commit -m "feat(map): support invasive_risk in filter and exclude dismissed tags"
```

---

### Task 6: Profile Cats List — Display Invasive Risk Tag

**Files:**

- Modify: `app/(app)/profile/[username]/components/my-cats-list.tsx`

**Interfaces:**

- Consumes: `TAG_META['invasive_risk']` from Task 2; updated `CatTag` type with `verification_status`
- Produces: Invasive risk pills render on the profile list with pending/verified badge

- [ ] **Step 1: Update TAG_ORDER to include invasive_risk**

```typescript
const TAG_ORDER: CatTag['tag'][] = ['needs_medical', 'possible_rabies', 'invasive_risk', 'deceased']
```

- [ ] **Step 2: Update RESOLVE_LABEL and TAG_TOAST_LABEL**

```typescript
const RESOLVE_LABEL: Record<CatTag['tag'], string> = {
  needs_medical: 'Recovered',
  possible_rabies: 'Cleared',
  invasive_risk: '',
  deceased: '',
}

const TAG_TOAST_LABEL: Record<CatTag['tag'], string> = {
  needs_medical: 'Needs medical',
  possible_rabies: 'Possible rabies',
  invasive_risk: 'Invasive risk',
  deceased: 'Passed away',
}
```

- [ ] **Step 3: Add verification status display**

Where tags are rendered as pills in this component, add pending/verified badge for invasive_risk. Find the tag pill rendering section and add after the label:

```tsx
{
  tag.tag === 'invasive_risk' && tag.verification_status === 'pending' && (
    <span className="ml-0.5 text-[9px] opacity-60">⏳</span>
  )
}
{
  tag.tag === 'invasive_risk' && tag.verification_status === 'verified' && (
    <span className="ml-0.5 text-[9px]">✓</span>
  )
}
```

- [ ] **Step 4: Prevent resolving verified invasive tags**

In the resolve handler or the resolvable check, ensure `invasive_risk` with `verified` status is not resolvable. The existing logic should only allow resolving `needs_medical` and `possible_rabies`, but verify this is the case.

- [ ] **Step 5: Verify type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add app/(app)/profile/[username]/components/my-cats-list.tsx
git commit -m "feat(profile): display invasive_risk tag with verification status on my cats list"
```

---

### Task 7: Community Vote UI — Verification Callout Component

**Files:**

- Create: `app/(app)/components/invasive-vote-callout.tsx`

**Interfaces:**

- Consumes: `CatTag` type with `verification_status`; `InvasiveRiskVote` type
- Produces: `<InvasiveVoteCallout catTagId={string} currentUserId={string} />` — self-contained component that fetches vote state and allows voting

- [ ] **Step 1: Create the vote callout component**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Leaf, ThumbsUp, ThumbsDown, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type VoteState = {
  confirmCount: number
  denyCount: number
  userVote: 'confirm' | 'deny' | null
}

export function InvasiveVoteCallout({
  catTagId,
  currentUserId,
  verificationStatus,
  onStatusChange,
}: {
  catTagId: string
  currentUserId: string
  verificationStatus: 'pending' | 'verified' | 'dismissed'
  onStatusChange?: (newStatus: 'verified' | 'dismissed') => void
}) {
  const [voteState, setVoteState] = useState<VoteState | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchVotes() {
      const supabase = createClient()
      const { data: votes } = await supabase
        .from('invasive_risk_votes')
        .select('vote, voted_by')
        .eq('cat_tag_id', catTagId)

      if (votes) {
        const confirmCount = votes.filter((v) => v.vote === 'confirm').length
        const denyCount = votes.filter((v) => v.vote === 'deny').length
        const userVote = votes.find((v) => v.voted_by === currentUserId)?.vote ?? null
        setVoteState({ confirmCount, denyCount, userVote })
      }
      setLoading(false)
    }

    fetchVotes()
  }, [catTagId, currentUserId])

  async function handleVote(vote: 'confirm' | 'deny') {
    setSubmitting(true)
    const supabase = createClient()

    const { error } = await supabase.from('invasive_risk_votes').insert({
      cat_tag_id: catTagId,
      voted_by: currentUserId,
      vote,
    })

    if (error) {
      if (error.code === '23505') {
        toast.error('You have already voted on this flag.')
      } else {
        toast.error('Could not submit vote.')
      }
      setSubmitting(false)
      return
    }

    const newState: VoteState = {
      confirmCount: voteState!.confirmCount + (vote === 'confirm' ? 1 : 0),
      denyCount: voteState!.denyCount + (vote === 'deny' ? 1 : 0),
      userVote: vote,
    }
    setVoteState(newState)
    setSubmitting(false)

    toast.success(vote === 'confirm' ? 'Vote recorded: Yes' : 'Vote recorded: No')

    // Check if threshold reached
    if (newState.confirmCount >= 3) {
      onStatusChange?.('verified')
    } else if (newState.denyCount >= 3) {
      onStatusChange?.('dismissed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
      </div>
    )
  }

  if (!voteState) return null

  // Already verified — show confirmed badge
  if (verificationStatus === 'verified') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-xs font-medium text-green-700 dark:bg-green-950/30 dark:text-green-300">
        <Check className="h-3.5 w-3.5" />
        <span>Verified by community ({voteState.confirmCount} confirmations)</span>
      </div>
    )
  }

  // Dismissed — don't render
  if (verificationStatus === 'dismissed') return null

  // User already voted
  if (voteState.userVote) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50/50 px-3 py-2 dark:border-green-800/50 dark:bg-green-950/20">
        <div className="flex items-center gap-2 text-xs font-medium text-green-700 dark:text-green-300">
          <Check className="h-3.5 w-3.5" />
          <span>You voted: {voteState.userVote === 'confirm' ? 'Yes' : 'No'}</span>
        </div>
        <p className="text-muted-foreground mt-1 text-[10px]">
          {voteState.confirmCount} of 3 confirmations
        </p>
      </div>
    )
  }

  // Show vote prompt
  return (
    <div className="space-y-2 rounded-xl border border-green-200 bg-green-50/50 p-3 dark:border-green-800/50 dark:bg-green-950/20">
      <div className="flex items-center gap-2">
        <Leaf className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        <span className="text-xs font-semibold text-green-800 dark:text-green-200">
          Invasive risk — verify?
        </span>
      </div>
      <p className="text-muted-foreground text-[11px]">
        Do you think this cat is a risk to local wildlife?
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 flex-1 gap-1 rounded-lg text-xs"
          onClick={() => handleVote('confirm')}
          disabled={submitting}
        >
          <ThumbsUp className="h-3 w-3" />
          Yes
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 flex-1 gap-1 rounded-lg text-xs"
          onClick={() => handleVote('deny')}
          disabled={submitting}
        >
          <ThumbsDown className="h-3 w-3" />
          No
        </Button>
      </div>
      <p className="text-muted-foreground text-[10px]">
        {voteState.confirmCount} of 3 confirmations needed
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Verify type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/components/invasive-vote-callout.tsx
git commit -m "feat(tag): add InvasiveVoteCallout component for community verification"
```

---

### Task 8: Re-Sighting Vote Prompt

**Files:**

- Modify: `app/(app)/tag/components/match-found-screen.tsx`

**Interfaces:**

- Consumes: `InvasiveVoteCallout` component from Task 7; full `CatTag` rows (already fetched)
- Produces: After sighting is saved, if cat has pending invasive flag, prompt appears

- [ ] **Step 1: Add vote prompt after sighting saved**

Import the component:

```typescript
import { InvasiveVoteCallout } from '@/app/(app)/components/invasive-vote-callout'
```

After the `!saving && !editSaved` community editing section, add a new section that shows when there's a pending invasive flag:

```tsx
{
  /* Invasive risk verification prompt — shown after sighting saved */
}
{
  !saving &&
    (() => {
      const pendingInvasive = tags.find(
        (t) => t.tag === 'invasive_risk' && t.verification_status === 'pending'
      )
      if (!pendingInvasive) return null
      // Don't prompt the flagger (they already voted)
      if (pendingInvasive.added_by === currentUserId) return null
      return (
        <div className="mt-4 w-full">
          <InvasiveVoteCallout
            catTagId={pendingInvasive.id}
            currentUserId={currentUserId}
            verificationStatus="pending"
          />
        </div>
      )
    })()
}
```

- [ ] **Step 2: Get currentUserId from auth**

The component already calls `supabase.auth.getUser()` in `recordSighting`. Store the user ID in state:

Add state:

```typescript
const [currentUserId, setCurrentUserId] = useState<string | null>(null)
```

In `recordSighting`, after getting user:

```typescript
setCurrentUserId(user.id)
```

- [ ] **Step 3: Fetch full tag rows (including verification_status)**

The component already fetches tags with `supabase.from('cat_tags').select('*')`. The `tags` state is `CatTag[]` which now includes `verification_status`. No additional fetch needed.

- [ ] **Step 4: Verify type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/tag/components/match-found-screen.tsx
git commit -m "feat(tag): show invasive risk vote prompt on re-sighting"
```

---

### Task 9: Catch Flow API Route — Set verification_status and Auto-Vote on New Cat

**Files:**

- Modify: `app/api/catch-cat/route.ts`

**Interfaces:**

- Consumes: `tags` array from request body (now includes `'invasive_risk'`)
- Produces: When a new cat is caught with `invasive_risk` selected, the tag is inserted with `verification_status = 'pending'` and the flagger's confirm vote is auto-inserted

- [ ] **Step 1: Update ALLOWED_TAGS to include invasive_risk**

```typescript
const ALLOWED_TAGS = ['needs_medical', 'possible_rabies', 'deceased', 'invasive_risk'] as const
```

- [ ] **Step 2: Update the tag insert to set verification_status for invasive_risk**

Replace the existing tag insertion block:

```typescript
const validTags = tags.filter(isValidTag)
if (validTags.length > 0) {
  const { data: insertedTags } = await supabase
    .from('cat_tags')
    .insert(
      validTags.map((tag) => ({
        cat_id: cat.id,
        tag,
        added_by: user.id,
        ...(tag === 'invasive_risk' ? { verification_status: 'pending' as const } : {}),
      }))
    )
    .select('id, tag')

  // Auto-insert first confirm vote for invasive_risk
  if (insertedTags) {
    const invasiveRow = insertedTags.find((t) => t.tag === 'invasive_risk')
    if (invasiveRow) {
      await supabase.from('invasive_risk_votes').insert({
        cat_tag_id: invasiveRow.id,
        voted_by: user.id,
        vote: 'confirm',
      })
    }
  }
}
```

- [ ] **Step 3: Verify type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/catch-cat/route.ts
git commit -m "feat(tag): set pending verification and auto-vote on invasive_risk during catch"
```

---

### Task 10: Full Build Verification

**Files:** None (verification only)

**Interfaces:** All previous tasks

- [ ] **Step 1: Run type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 2: Run linter**

```bash
npm run lint
```

Expected: No errors (or only pre-existing warnings).

- [ ] **Step 3: Run format check**

```bash
npm run format:check
```

If failures, run `npm run format` and re-check.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: Successful production build.

- [ ] **Step 5: Manual smoke test checklist**

Run `npm run dev` and verify:

1. Details screen shows "Ecological flags" section with "Invasive risk" pill
2. Selecting invasive_risk and completing catch flow inserts the tag
3. Map filter sheet shows "Invasive risk" as a filter option
4. Cat preview card shows the green invasive_risk pill
5. Profile cats list shows the tag with pending badge
6. Re-sighting a cat with pending invasive flag shows the vote prompt

- [ ] **Step 6: Final commit (if format/lint auto-fixed anything)**

```bash
git add -A
git commit -m "style: format and lint fixes for invasive risk feature"
```
