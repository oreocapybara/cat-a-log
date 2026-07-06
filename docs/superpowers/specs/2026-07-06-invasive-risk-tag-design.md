# Invasive Risk Tag — Design Spec

## Purpose

Provide actionable data for conservation and TNR groups by allowing users to flag cats that pose a risk to local ecosystems. Unlike the existing medical/welfare tags, this flag includes community verification to ensure data quality before it's considered trustworthy.

## Decisions

| Decision              | Choice                                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Motivation            | Actionable data for conservation/TNR groups                                                                           |
| Determination method  | User-flagged, same low-friction as existing tags                                                                      |
| Engagement model      | Community verification built in from day one                                                                          |
| Lifecycle             | Stricter than medical tags — once community-verified, individual users cannot resolve; only counter-votes can reverse |
| Verification surfaces | Cat profile/preview card + re-sighting prompt. No map-level interruptions                                             |
| Threshold             | Fixed: 3 confirms = verified, 3 denies = dismissed. Schema stores raw counts to support changing later                |
| Naming                | DB value: `invasive_risk`. UI label: "Invasive risk"                                                                  |
| Architecture          | Extend `cat_tags` CHECK + add `verification_status` column + new `invasive_risk_votes` table                          |

## Schema & Data Layer

### Migration: extend `cat_tags`

```sql
-- Add 'invasive_risk' to the CHECK constraint
ALTER TABLE cat_tags DROP CONSTRAINT cat_tags_tag_check;
ALTER TABLE cat_tags ADD CONSTRAINT cat_tags_tag_check
  CHECK (tag IN ('needs_medical', 'possible_rabies', 'deceased', 'invasive_risk'));

-- Verification status — NULL for medical tags, populated for invasive_risk
ALTER TABLE cat_tags ADD COLUMN verification_status text
  CHECK (verification_status IS NULL OR verification_status IN ('pending', 'verified', 'dismissed'));
```

### New table: `invasive_risk_votes`

```sql
CREATE TABLE invasive_risk_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_tag_id  uuid NOT NULL REFERENCES cat_tags(id) ON DELETE CASCADE,
  voted_by    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote        text NOT NULL CHECK (vote IN ('confirm', 'deny')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cat_tag_id, voted_by)  -- one vote per user per flag
);
```

### Auto-resolve trigger

An AFTER INSERT trigger on `invasive_risk_votes` counts votes and updates the parent `cat_tags` row:

- When confirm count reaches 3 → set `verification_status = 'verified'`
- When deny count reaches 3 → set `verification_status = 'dismissed'`

Runs as `SECURITY DEFINER` with pinned `search_path = ''`. Direct EXECUTE revoked from public/anon/authenticated.

### Interaction with `deceased` auto-resolve

The existing `resolve_other_tags_on_deceased()` trigger must be modified to skip `invasive_risk` tags — change the UPDATE's WHERE clause to include `AND tag != 'invasive_risk'`. A dead cat's ecological history is still useful data for conservation groups.

## Tag Addition UX

### Catch flow (details screen)

The details screen's tag section gains a second group separated by a sub-header:

```
[Health flags]
  [🩺 Needs medical] [⚠️ Possible rabies] [💀 Passed away]

[Ecological flags]
  [🌿 Invasive risk]
```

Same tap-to-toggle pill interaction. Grouped visually with a "Ecological flags" label and a Leaf icon.

### Cat profile (post-hoc flagging)

Users can add the tag from the cat's profile page via a "+ Add flag" interaction in the tags section — for cats encountered after initial registration.

### On addition

1. Row inserted into `cat_tags` with `tag = 'invasive_risk'`, `verification_status = 'pending'`
2. Tag immediately appears on the cat's profile/preview with a "Pending" badge
3. A corresponding row is inserted into `invasive_risk_votes` counting the flagger as the first "confirm" vote

No reason/evidence field for v1. If data quality becomes an issue, an optional reason dropdown can be added later.

## Community Verification UX

### Surface 1: Cat profile/preview card (passive discovery)

When viewing a cat with a pending invasive flag, a callout appears below the tag pill:

- Shows the pending tag with vote progress ("1 of 3 confirmations needed")
- Confirm / Deny buttons
- After voting, collapses to "You voted: Yes ✓" or "You voted: No ✓"
- Only shown if the current user hasn't voted yet

### Surface 2: Re-sighting prompt (high-signal moment)

When a user logs a new sighting of a cat with a pending invasive flag, after the sighting is saved:

- Bottom sheet or inline card: "This cat has been flagged as an invasive risk. Based on your sighting, do you agree?"
- Three options: [Yes, I agree] [No, I don't think so] [Skip]
- Never blocks the sighting flow — dismissable via Skip
- Only shown once per user per flag

### Vote rules

- One vote per user per flag (enforced by UNIQUE constraint on `cat_tag_id, voted_by`)
- Original flagger's vote auto-counted as first confirm
- Users cannot vote on their own flag (already counted)
- Votes are permanent — no take-backs for v1

### Status transitions

| Condition             | Result                                |
| --------------------- | ------------------------------------- |
| 3 confirms reached    | `verification_status` → `'verified'`  |
| 3 denies reached      | `verification_status` → `'dismissed'` |
| Neither threshold met | Stays `'pending'`                     |

If both counts grow without hitting threshold (e.g., 2 confirms, 2 denies), it remains pending waiting for a tie-breaker.

## Display & Rendering

### Tag appearance by status

| Status    | Pill style                           | Badge         | Visibility                  |
| --------- | ------------------------------------ | ------------- | --------------------------- |
| Pending   | Muted green background, subdued text | ⏳ clock icon | Shown everywhere            |
| Verified  | Solid green background, white text   | ✓ checkmark   | Shown everywhere, prominent |
| Dismissed | Hidden from UI                       | —             | Not rendered                |

### Icon

Leaf (`Leaf` from Lucide) in green — distinct from the medical tag icons (Stethoscope, AlertTriangle, Skull).

### Affected surfaces

1. **Cat preview card (map)** — shows the invasive pill alongside medical tags with appropriate styling
2. **Cat profile page** — pill rendering + vote callout if pending and user hasn't voted
3. **Filter sheet (map)** — new "Invasive risk" filter option under an "Ecological" subgroup
4. **Profile cats list** — shows the pill on owned/tagged cats; owner sees vote progress
5. **Match-found screen (catch flow)** — shows flag on candidate matches for context
6. **Details screen (catch flow)** — where the tag is first added (ecological flags group)

### Unchanged behavior

- Medical tag rendering logic (`needs_medical`, `possible_rabies`, `deceased`) is untouched
- Existing tag pill component extended with new color/icon config entry
- Queries that fetch `cat_tags` already return all tags — `verification_status` determines styling

## RLS & Security

### `invasive_risk_votes` policies

| Operation | Rule                                                                          |
| --------- | ----------------------------------------------------------------------------- |
| SELECT    | Public — anyone can see vote counts                                           |
| INSERT    | Authenticated, `voted_by = auth.uid()`, unique constraint prevents duplicates |
| UPDATE    | None — votes are immutable                                                    |
| DELETE    | None — votes are permanent                                                    |

### Modified `cat_tags` policies

**Resolve (UPDATE):** Existing "Authenticated users can resolve cat tags" gains:

```sql
AND NOT (tag = 'invasive_risk' AND verification_status = 'verified')
```

**Delete:** Existing "Tag adder can remove their own tag" and "Cat owner can remove tags" gain:

```sql
AND NOT (tag = 'invasive_risk' AND verification_status = 'verified')
```

Pending invasive tags remain deletable by adder/owner — verification hasn't happened yet.

### Trigger security

Auto-verify trigger function: `SECURITY DEFINER`, pinned `search_path = ''`, EXECUTE revoked from public/anon/authenticated. Same pattern as `resolve_other_tags_on_deceased()`.

### Edge cases

| Scenario                  | Behavior                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Cat merged via match vote | Winning cat inherits the invasive tag (FK follows `cat_id`)                                                           |
| Cat deleted               | Cascades delete the tag and its votes (`ON DELETE CASCADE`)                                                           |
| Flagger deletes account   | `added_by` nulled (`SET NULL`), tag persists, votes persist                                                           |
| Voter deletes account     | Vote row cascades deleted; `verification_status` is NOT reverted (trigger is INSERT-only, status is already baked in) |

## Out of Scope (v1)

- Location-aware auto-flagging (sensitive zones dataset)
- Evidence/reason field on flag creation
- Engagement layer (hotspot map, conservation stats, badges)
- Undo/change vote
- Percentage-based or net-score thresholds
- Push notifications for verification prompts

## TypeScript Type Changes

```typescript
// In lib/supabase/types.ts
cat_tags.Row.tag: 'needs_medical' | 'possible_rabies' | 'deceased' | 'invasive_risk'
cat_tags.Row.verification_status: 'pending' | 'verified' | 'dismissed' | null

// New table type
invasive_risk_votes: {
  Row: {
    id: string
    cat_tag_id: string
    voted_by: string
    vote: 'confirm' | 'deny'
    created_at: string
  }
  // Insert/Update types follow the same pattern
}
```
