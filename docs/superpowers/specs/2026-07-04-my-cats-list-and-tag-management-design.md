# My Cats List & Owner Tag Management — Design

## Goal

Give users a "My Cats" section on `/profile/me` listing the cats they've tagged, and let them add or remove welfare tags (`needs_medical`, `possible_rabies`, `deceased`) on cats they own. This closes a real gap — today only the person who _added_ a tag can remove it, so an owner has no way to clear a tag once it's been handled (e.g. a cat marked `needs_medical` that's since been treated).

The list also serves as an engagement anchor: a persistent, personal view of "your" cats that reinforces investment in the app, and doubles as groundwork for the delete-a-cat feature (still to be explored) and a future sharing feature (separate spec — see note at the end).

## Decisions made

- **Location:** new list lives on `/profile/me`, not bolted onto the map's preview card.
- **Tag control scope:** full control — owner can add or remove any of the 3 tags on cats they own, not just resolve existing ones. Chosen for the engagement value of an "investment" action, not just cleanup.
- **List content:** photo, name, tags, times spotted, last-seen — mirrors the map's `cat-preview-card` for visual consistency and to reinforce that a user's cats are alive/active in the community.
- **Interaction:** tap-to-toggle chips, no modal/confirm step.
- **Sequencing:** this ships first; a "share your collected cats" feature is a separate follow-on brainstorm, not part of this spec.

## Data model & RLS

No schema changes. One new migration adds a second (additive) DELETE policy on `cat_tags`:

```sql
CREATE POLICY "Cat owner can remove tags on their own cat"
  ON cat_tags FOR DELETE USING (
    auth.uid() = (SELECT tagged_by FROM cats WHERE id = cat_tags.cat_id)
  );
```

Postgres OR's multiple permissive policies for the same command together, so the existing "Tag adder can remove their own tag" policy is untouched — a tag can now be removed by whoever added it _or_ by the cat's owner.

No INSERT policy change is needed: the existing policy (`auth.role() = 'authenticated' AND auth.uid() = added_by`) already permits the owner to add a tag to their own cat. There has simply never been a UI for adding a tag after catch-time until now.

## Fetching

Extend `app/(app)/profile/me/page.tsx` (already a server component) after the existing profile query:

1. `cats` where `tagged_by = user.id`, ordered by `created_at desc` — `id`, `name`, `primary_photo_url`, `created_at`.
2. `cat_tags` where `cat_id in (...)` for those cats.
3. `sightings` where `cat_id in (...)`, to compute `times_spotted = 1 + count(sightings)` per cat client-side — the same formula the `nearby_cats()` SQL function already uses, done here as a plain query since this list isn't location-bound and doesn't warrant a new SQL function.

These three queries are passed down as props to the new list component. No new SQL function, no new types beyond what's already in `lib/supabase/types.ts` (`Cat`, `CatTag`).

## Component

New file: `app/(app)/profile/me/components/my-cats-list.tsx` (client component, colocated — only used by this page).

Each card renders:

- Photo, name (or "Unnamed cat")
- "Spotted N times" and last-seen caption, via the existing `formatLastSeen` (`lib/geo.ts`) — same convention the map card uses (based on `created_at`, not latest sighting)
- 3 tag chips reusing `TAG_META` from `lib/welfare-colors.ts` for icon/label/color consistency with the map. Active tags render filled, inactive render outlined.

**Interaction:** tapping a chip toggles local state immediately (optimistic), then fires the actual `insert` or `delete` against `cat_tags` via the browser Supabase client. On failure, revert the chip state and `toast.error(...)` — same pattern as `map/page.tsx` and `sign-out-button.tsx`.

**Empty state:** "You haven't tagged any cats yet" with a button linking to `/tag` — turns an empty list into a call-to-action instead of a dead end.

## Explicitly out of scope

- Deleting a cat entirely — flagged for future exploration, not built here.
- Sharing collected cats — separate spec, next brainstorm. Note: an unimplemented, uncommitted spec already exists at `docs/superpowers/specs/2026-07-04-cat-share-card-design.md` for per-cat share cards (map-triggered, Instagram-Stories-sized image, sighting tiers). It's angled at sharing individual cats, not a user's whole collection — review it before designing the collection-sharing feature, since it may cover overlapping ground or need extending rather than starting fresh.
- Editing a cat's name/notes/photo — untouched, tags only.
- No audit trail/history for tag changes — removing a tag deletes the row, same as `cat_tags`' existing behavior.

## Verification

No test runner is configured in this repo (lint/type-check/build only, no Jest/Vitest). Verification is manual:

1. Run the dev server, tag a cat via `/tag`, confirm it appears in the My Cats list on `/profile/me`.
2. Toggle a tag on in the list, confirm it persists on reload and reflects on the map's `cat-preview-card` for that cat.
3. Toggle a tag off (as owner, on a tag someone else added), confirm the RLS policy allows it and the removal persists.
4. Simulate a failed mutation (e.g. offline) and confirm the chip reverts with a toast error.
5. Confirm the empty state and its `/tag` CTA render for a user with no tagged cats.
