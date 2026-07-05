# Shareable Catch Card — Design

## Goal

Give every catch — tagging a brand-new cat or re-spotting a known one — a distinct, shareable "Pokemon card, modern theme" image, generated the moment the catch completes. Distinctness comes from two layers: real data (the actual catch photo, tier/sighting count, timestamp) plus a randomized-but-deterministic visual flourish (foil shimmer angle), so no two catches render identically but a given catch always renders the same way if shared or re-fetched.

This builds directly on the existing `feat/shareable-profiles` work: `app/api/profile-card/[username]/route.tsx` already establishes the "dark surround, holographic border, illustration window" visual system via `next/og`'s `ImageResponse`, and `share-profile-button.tsx` already establishes the share-or-download interaction. The catch card reuses both rather than reinventing them.

**Distinct from a related, unimplemented idea:** an earlier, uncommitted spec (referenced in `2026-07-04-my-cats-list-and-tag-management-design.md`, filename `2026-07-04-cat-share-card-design.md`) proposed a **map-triggered** per-cat share card — shared from a cat's preview card on the map, independent of when it was caught. That file no longer exists anywhere in git history (working-tree-only, never committed, lost across branch switches). This spec is a different trigger point — **catch-moment**, not map-browsing — and doesn't attempt to recover or fulfill that older idea. A map-triggered "share this cat" feature remains a separate, future brainstorm.

## Decisions made

- **Trigger point:** the card appears as a new "catch complete" beat at the end of both tagging flows, replacing the current silent redirect for new cats and extending the existing success screen for repeat sightings.
- **Two variants, one visual system:**
  - **New discovery** (first-ever sighting of a cat): gold/amber foil, "✨ NEW SPECIES" badge, registry sequence number, "First spotted by you today," a community-momentum line.
  - **Existing catch** (repeat sighting): tier-colored foil (reuses `lib/sighting-tiers.ts`), tier name + rarity dots, "Spotted N× by the community," progress bar to next tier.
- **Photo used:** the specific catch's photo (the cat's `primary_photo_url` for a new cat, the `sightings.photo_url` for a repeat) — a snapshot of that moment, not necessarily the cat's current primary photo.
- **Foil style:** diagonal shimmer bands, single-hue (tinted to the card's own border color — gold for new discovery, tier color for existing), angle/offset seeded deterministically from the catch's id. Explored and rejected: curved/radial variants and full-spectrum rainbow foil — both read as busier than this app's existing restrained visual language (the profile card uses a single tier hue throughout).
- **Reveal:** the card animates in (scale + fade, ~400ms) when the completion screen mounts, using the same `motion-safe:animate-in` utilities already used in `tag/save/page.tsx` — no new animation library.
- **Psychology hooks baked into content, not added as separate mechanics:** discovery status (collector/completionist instinct), a visible progress bar to next tier (Zeigarnik effect — visible incompleteness nags at return visits), social-proof stats (community sighting counts), and identity credit ("@you discovered this" / "@you spotted this") to drive the share-loop.

## API route

New `app/api/catch-card/route.tsx`, modeled directly on `app/api/profile-card/[username]/route.tsx`:

- `GET /api/catch-card?catId=<uuid>` — new-discovery card. Fetches the `cats` row (name, primary_photo_url, created_at, tagged_by → profiles.username/avatar_url), plus a cheap registry sequence number (count of cats created at or before this one) and a "cats tagged this week" count.
- `GET /api/catch-card?sightingId=<uuid>` — existing-catch card. Fetches the `sightings` row (photo_url, created_at, cat_id, spotted_by → profiles.username/avatar_url) joined with its `cats` row (name), plus `times_spotted` (`1 + count(sightings for this cat_id)`, same formula used elsewhere) to derive the tier via `getSightingTier`.
- Exactly one of the two params is required; the route 400s if both or neither are present.
- Same `ImageResponse` dimensions and cache headers as the profile card (`1080×1920`, `public, max-age=3600, stale-while-revalidate=86400` — safe because a catch's underlying data doesn't change after the fact, and the seed seeds off an immutable id).

**Foil seed helper**, `lib/catch-card-seed.ts` (~10 lines): a mulberry32-style PRNG seeded by hashing the id string, producing a stable angle (e.g. 100–130deg) and band offset. Pure function, no I/O.

## Flow changes

**New cat** (`app/(auth)/tag/flush/page.tsx`): on success, change `router.replace('/map?cat=${catId}')` to `router.replace('/tag/complete?catId=${catId}')`.

**New page** `app/(auth)/tag/complete/page.tsx` (colocated alongside `tag/save`, `tag/flush` — same auth-group placement, same "reachable mid-flow, not a public entry point" treatment): renders the reveal animation, the card (`<img src="/api/catch-card?catId=...">`), a share button, and a "Back to the map" button that navigates to `/map?cat=${catId}`.

**Existing cat** (`app/(app)/tag/components/match-found-screen.tsx`): extended in place, not replaced. Once the `sightings` insert resolves and yields its new row's `id`, render the card (`<img src="/api/catch-card?sightingId=...">`) with the same reveal animation and share button, alongside the stats already shown. The existing "Back to the map" button is unchanged.

**Shared share logic**: extract the `fetch → blob → File → navigator.share/download` block currently inline in `share-profile-button.tsx` into `lib/share-image.ts` (a single function taking a card URL, filename, and share-sheet title/text). Both `ShareProfileButton` and the new catch-card share button call it — avoids duplicating the Web Share API / clipboard-fallback / download-fallback logic a second time.

## Routing/auth

Add `/api/catch-card` to `PUBLIC_PREFIXES` in `proxy.ts` (same treatment as `/api/profile-card/`) so a shared image link resolves for recipients who aren't signed in. `/tag/complete` itself stays behind the normal auth gate — it's reached only via the in-app flow immediately after a catch, not as a standalone public share link (the public artifact is the image URL, not the page).

## Explicitly out of scope

- Map-triggered "share this cat" from `cat-preview-card.tsx`, independent of the catch moment — a separate future feature (see note above about the lost prior spec).
- Persisting rendered card images to storage — on-demand rendering (proven by the profile card) is sufficient; the seed already guarantees a stable render per catch without needing to store bytes.
- Any card customization by the user (choosing a different photo, editing text) — the card reflects the catch as it happened.

## Verification

No test runner is configured in this repo. Verification is manual, plus one self-check script:

1. `lib/catch-card-seed.selfcheck.mts` (matching the existing `lib/clustering.selfcheck.mts` convention) — assert the seed function returns the same angle/offset for a repeated id, and a different one for a different id.
2. Tag a brand-new cat end to end; confirm `/tag/complete` shows the reveal animation, a gold-foil "NEW SPECIES" card with that catch's photo, and that sharing/downloading it works.
3. Spot an existing cat (via the candidates-match flow); confirm `MatchFoundScreen` now also shows a tier-colored card with that sighting's photo, correct tier/progress-bar numbers, and a working share button.
4. Confirm two different catches render visibly different foil angles, and re-fetching the same catch's card URL twice renders identically.
5. Confirm `/api/catch-card` is reachable without auth (e.g. via `curl` or an incognito tab) given a valid id, matching the public-share intent.
6. Confirm `/api/catch-card` 400s when called with both or neither of `catId`/`sightingId`.
