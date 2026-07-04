# My Cats List & Community Tag Resolution — Design

## Goal

Give users a "My Cats" section on `/profile/me` listing the cats they've tagged, and let _any_ signed-in user (not just the cat's owner) mark a welfare tag (`needs_medical`, `possible_rabies`) as resolved once a cat has been helped or is confirmed okay. This closes a real gap — today only the person who _added_ a tag can remove it, and removal is a silent delete with no record the cat was ever in need or that someone helped.

Scope grew during design from "owner-only tag toggling" to a community-wide resolve model, because tagging itself has always been community-wide (any authenticated user can already tag any cat `needs_medical`) — restricting _resolving_ to the owner alone would have been an inconsistent, narrower trust model than the app already uses for adding tags.

The list also serves as an engagement anchor: a persistent, personal view of "your" cats that reinforces investment in the app, and doubles as groundwork for the delete-a-cat feature (still to be explored) and a future sharing feature (separate spec — see note at the end).

## Decisions made

- **Location:** a new "My Cats" list on `/profile/me`, plus resolve controls added to the map's existing `cat-preview-card.tsx` so any user can resolve a tag on any cat, not just their own.
- **Tag control scope on My Cats list:** full control — owner can add or remove any of the 3 tags on cats they own.
- **Resolve scope:** any authenticated user can resolve `needs_medical`/`possible_rabies` on any cat (mirrors the existing community-wide INSERT policy). Hard-delete (removing a tag row entirely) stays restricted to the tag's original adder or the cat's owner — a correction action, not a confirmation.
- **List content:** photo, name, tags, times spotted, last-seen — mirrors the map's `cat-preview-card` for visual consistency.
- **Interaction:** tap-to-toggle chips, no modal/confirm step.
- **Sequencing:** this ships first; a "share your collected cats" feature is a separate follow-on brainstorm, not part of this spec.

## Data model & RLS

New migration:

1. Add nullable columns to `cat_tags`: `resolved_at timestamptz`, `resolved_by uuid REFERENCES profiles(id)`. An "active" tag has `resolved_at IS NULL`.
2. New UPDATE policy — any authenticated user can resolve any tag:

```sql
CREATE POLICY "Authenticated users can resolve cat tags"
  ON cat_tags FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated' AND resolved_by = auth.uid());
```

3. New DELETE policy — additive, lets the cat's owner hard-delete a tag on their own cat (corrects a mistaken tag), alongside the existing "tag adder can remove their own tag" policy:

```sql
CREATE POLICY "Cat owner can remove tags on their own cat"
  ON cat_tags FOR DELETE USING (
    auth.uid() = (SELECT tagged_by FROM cats WHERE id = cat_tags.cat_id)
  );
```

Postgres OR's multiple permissive policies for the same command together, so both DELETE policies apply — a tag can be hard-deleted by whoever added it _or_ by the cat's owner.

No INSERT policy change: the existing policy (`auth.role() = 'authenticated' AND auth.uid() = added_by`) already lets any authenticated user tag any cat, including ones they don't own.

## Resolve vs. hard-delete, per tag

| Tag               | Resolve (any user)                                        | Hard-delete (adder/owner only)                                          |
| ----------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| `needs_medical`   | Yes — sets `resolved_at`/`resolved_by`, shows "Recovered" | Corrects a mistaken tag                                                 |
| `possible_rabies` | Yes — sets `resolved_at`/`resolved_by`, shows "Cleared"   | Corrects a mistaken tag                                                 |
| `deceased`        | No — a cat doesn't "recover" from this                    | Only way to remove it (corrects a mistaken tag, e.g. wrong cat matched) |

**Deceased auto-cascade:** when a `deceased` tag is added to a cat, any other active tags on that cat are auto-resolved in the same operation (`resolved_at = now()`, `resolved_by` = whoever added the `deceased` tag) — the medical concern is moot now, not "treated," but this avoids showing a contradictory "Needs medical" + "Deceased" state. Once `deceased` is active, the `needs_medical`/`possible_rabies` chips are disabled in both the My Cats list and the map card's tag controls — no point flagging new medical concern for a cat already marked dead.

## Fetching

Extend `app/(app)/profile/me/page.tsx` (already a server component) after the existing profile query:

1. `cats` where `tagged_by = user.id`, ordered by `created_at desc` — `id`, `name`, `primary_photo_url`, `created_at`.
2. `cat_tags` where `cat_id in (...)` for those cats — **all rows, active and resolved** (the My Cats list shows resolve history, unlike the map's active-only queries below).
3. `sightings` where `cat_id in (...)`, to compute `times_spotted = 1 + count(sightings)` per cat client-side, same formula `nearby_cats()` already uses.

**Knock-on fix required:** the map's existing active-tag queries (`map/page.tsx`'s `cat_tags` fetch, and anywhere `getWelfareTier`/`TAG_META` filters by active tags) currently do `.select('cat_id, tag')` with no resolved filter. These need `.is('resolved_at', null)` added — otherwise a resolved cat would still show its old "needs medical" welfare tier and badge on the map.

## Components

**`app/(app)/profile/me/components/my-cats-list.tsx`** (new, client component, colocated). Each card renders:

- Photo, name (or "Unnamed cat")
- "Spotted N times" and last-seen caption, via existing `formatLastSeen` (`lib/geo.ts`)
- Active tag chips (filled) reusing `TAG_META`, plus resolved-tag badges (muted, e.g. "✓ Recovered 3 days ago", "✓ Cleared 3 days ago", "Passed away · 3 days ago" for deceased using the tag's `created_at`)

Interaction: tap an inactive chip → insert row. Tap an active `needs_medical`/`possible_rabies` chip → UPDATE `resolved_at`/`resolved_by` (soft-resolve). Tap an active `deceased` chip → DELETE row (hard, correction only). All optimistic with revert + `toast.error(...)` on failure, matching the existing pattern in `map/page.tsx`/`sign-out-button.tsx`.

Empty state: "You haven't tagged any cats yet" with a button linking to `/tag`.

**`app/(app)/map/components/cat-preview-card.tsx`** (existing file, modified): add a lightweight "Mark as recovered"/"Mark as cleared" action for any cat carrying an active `needs_medical`/`possible_rabies` tag, visible to any signed-in user. Reuses the same soft-resolve mutation as the My Cats list. No voting/confirmation step — consistent with tagging already being unilateral today.

**`app/(app)/map/components/filter-sheet.tsx`** (existing file, modified): a cat with an active `deceased` tag is excluded from the default (no-filter) map view. It only reappears if the user explicitly checks the "Passed away" filter chip to opt in. This reuses the existing filter mechanism — one added rule in `matchesFilters`, no new UI. The My Cats list is unaffected by this filter; the original tagger/owner always sees their own cat's full history there regardless of deceased status.

## Messaging

Change the `deceased` label in `TAG_META` (`lib/welfare-colors.ts`) from "Deceased" to **"Passed away"** — warmer, less clinical, since this is the one tag where softening tone matters (unlike `needs_medical`/`possible_rabies`, where clinical urgency is the point). Keep the icon `null` and the existing muted `bg-secondary` styling — no red, no alarm icon. This label is shared across the map card, filter sheet, and My Cats list, so it can't drift.

## Explicitly out of scope

- Deleting a cat entirely — flagged for future exploration, not built here.
- Sharing collected cats — separate spec, next brainstorm. Note: an unimplemented, uncommitted spec already exists at `docs/superpowers/specs/2026-07-04-cat-share-card-design.md` for per-cat share cards (map-triggered, Instagram-Stories-sized image, sighting tiers). It's angled at sharing individual cats, not a user's whole collection — review it before designing the collection-sharing feature.
- Editing a cat's name/notes/photo — untouched, tags only.
- Any voting/multi-confirmation step before a resolve takes effect — resolving is unilateral, matching how adding a tag already works.

## Verification

No test runner is configured in this repo (lint/type-check/build only, no Jest/Vitest). Verification is manual:

1. Tag a cat via `/tag` with `needs_medical`, confirm it appears active in both the My Cats list and the map's `cat-preview-card`.
2. As a _different_ signed-in user (not the owner or original tagger), resolve the `needs_medical` tag from the map card. Confirm it shows "Recovered" with the resolver's action reflected, and the cat's welfare tier/badge on the map reverts to default.
3. On the My Cats list, hard-delete a mistakenly-added tag as the owner; confirm a non-owner without adder rights cannot do the same (RLS blocks it).
4. Tag a cat `deceased` while it has an active `needs_medical` tag; confirm the medical tag auto-resolves and both chips for `needs_medical`/`possible_rabies` become disabled.
5. Confirm a `deceased` cat is hidden from the default map view, and reappears only when the "Passed away" filter chip is checked.
6. Confirm the deceased label reads "Passed away" everywhere it appears (map card, filter sheet, My Cats list), with a relative-time caption in the My Cats list.
7. Confirm the empty state and its `/tag` CTA render for a user with no tagged cats.
