# My Cats List & Tag Resolution — Handover

**Status:** Code complete, unverified. Everything below "What's left" needs a human (or an agent with real browser access) with two Supabase test accounts.

## Where things are

- **Branch:** `feat/my-cats-list-and-tag-resolution`, pushed to origin. Based on `feat/map-search-ux` (which was already merged to `main` via PR #28 up to `22829e1` — its remote branch is deleted, so this branch and PR target `main` directly).
- **Open a PR:** https://github.com/oreocapybara/cat-a-log/pull/new/feat/my-cats-list-and-tag-resolution (not yet created — `gh` isn't authenticated in this environment; use the link or `gh auth login` first).
- **Spec:** `docs/superpowers/specs/2026-07-04-my-cats-list-and-tag-management-design.md`
- **Plan (already executed task-by-task):** `docs/superpowers/plans/2026-07-04-my-cats-list-and-tag-resolution.md`
- **DB migration already applied to the remote Supabase project** (`izmgruerqrbbovaigjqg`): `supabase/migrations/20260704115017_resolve_cat_tags.sql`. No further `db push` needed unless this branch is rebased before merging.

## What was built (9 commits, all passing format/lint/type-check/build)

1. `cat_tags` gained `resolved_at`/`resolved_by` columns, a community-wide resolve UPDATE policy, an owner-hard-delete DELETE policy, and a trigger that auto-resolves other active tags when a cat is tagged `deceased`.
2. `deceased` tag label renamed "Deceased" → "Passed away" everywhere (`lib/welfare-colors.ts`).
3. `lib/geo.ts` gained `formatRelativeTime()`, factored out of `formatLastSeen()`.
4. `filter-sheet.tsx`'s `matchesFilters` is now exported and hides `deceased` cats from the default map view unless the "Passed away" filter chip is checked.
5. `map/page.tsx`: active-tag query now filters `resolved_at IS NULL`; `filteredCats` reuses the shared `matchesFilters`; added `handleResolveTag`.
6. `cat-preview-card.tsx`: active `needs_medical`/`possible_rabies` chips are now tappable buttons that resolve the tag (any signed-in user, not just the tagger/owner).
7. `/profile/me` now fetches the user's tagged cats, all their `cat_tags` rows (active + resolved), and sighting counts.
8. New `app/(app)/profile/me/components/my-cats-list.tsx`: renders the list with tap-to-insert/resolve/hard-delete chips, disables medical/rabies chips once `deceased` is active, empty state with a `/tag` CTA.
9. Also folds in pre-existing `feat/map-search-ux` WIP that was sitting uncommitted when this work started: repositioned map attribution control, reworked gallery button placement, animated theme toggle.

## What's left — manual verification (I have no browser access in this environment)

Run through this on a real browser with **two signed-in test accounts** (call them A and B):

1. As A, tag a cat `needs_medical` via `/tag`. Confirm it shows active on both `/profile/me` (My Cats) and the map's preview card.
2. As B (not the tagger/owner), open that cat's preview card on `/map` and tap the "Needs medical" chip to resolve it. Confirm the chip disappears immediately (no reopen needed) and the marker's welfare color/badge reverts to default.
3. As A (the cat's owner), go to My Cats and hard-delete a mistakenly-added tag. Then, as B (not the adder or owner), confirm attempting the same delete is blocked by RLS (expect a Postgres error surfaced via `toast.error`).
4. As A, tag a cat `deceased` while it still has an active `needs_medical` tag. Confirm the medical tag auto-resolves (cascade trigger) and both medical/rabies chips become disabled (grayed, unclickable) on My Cats.
5. On `/map`, confirm that same deceased cat is hidden from the default view and only reappears when the "Passed away" filter chip is checked in the filter sheet.
6. Confirm the label reads "Passed away" consistently in the map card, filter sheet, and My Cats list, with a relative-time caption (e.g. "Passed away · 3 days ago") in My Cats.
7. Sign in as a brand-new user with no tagged cats; confirm the My Cats empty state renders with a working "Tag a cat" link to `/tag`.

## Known caveats / things to double-check while verifying

- The optimistic insert in `my-cats-list.tsx` uses a fake `id: "optimistic-<tag>"` row until the real insert resolves — if the insert fails, confirm the chip reverts to untagged rather than getting stuck.
- The RLS resolve policy requires `resolved_by = auth.uid()` — if step 2 fails with a permissions error instead of succeeding, that's the first place to check (`supabase/migrations/20260704115017_resolve_cat_tags.sql`).
- No test runner exists in this repo (confirmed via `package.json`) — there is nothing to `npm test`. Verification is manual/browser only, per the spec itself.
