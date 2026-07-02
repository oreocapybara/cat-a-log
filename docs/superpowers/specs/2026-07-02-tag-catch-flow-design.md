# Tag Flow Redesign — "Catch a Cat" — Design

## Goal

Replace the current form-first `/tag` page with a photo-first, multi-screen flow: upload a photo, get matched against nearby existing cats (or confirmed as a new "catch"), get a funny auto-generated name, and optionally flag medical status. Overall feel: catching a Pokémon / finding a limited-time souvenir, not filling out a form.

## Prerequisites (user will need to obtain)

- A free Hugging Face API token (Inference API), stored server-side as `HUGGINGFACE_API_TOKEN` (no `NEXT_PUBLIC_` prefix — must never reach the browser).

## Screen flow

```
Screen 1: Photo          → capture/upload only (native file input, unchanged
                             from the current /tag)
     ↓ (in parallel: GPS auto-captured via Geolocation API; photo uploads to
        the cat-photos bucket)
     — status line: "Getting your location… / Location captured ✓ /
       Location unavailable — retry"
     — "Not your location? Adjust on map" → opens a Leaflet map with a
       draggable pin (pre-placed at GPS coords, or map-center if GPS
       failed), user drags + confirms to override lat/lng. Hidden by
       default — only shown on demand, so the common "I'm standing next
       to the cat" case stays friction-free.
     ↓
Screen 2: Candidates      → nearby_cats(lat, lng, radius_km) results as
                             cards (photo, name, distance, status badges)
     ↓
     — tap a candidate → "Match!" ─────────────────────────────┐
     — tap "Not this cat" → proceeds to new-catch flow          │
     — tap "Not sure" → re-ranks the same cards by CLIP          │
       embedding similarity (see Matching subsystem below),      │
       stays on this screen                                      │
     ↓ (no match / "not this cat")                               │
Screen 3b: Name            → auto-generated (title+word+number), │
  (new catch only)            editable, "🎲 Try another" reroll   │
     ↓                        button — the "gotcha" moment        │
Screen 4b: Details          → ear-tipped checkbox, notes,         │
  (new catch only)             medical tags (needs_medical /      │
                                possible_rabies / deceased)        │
     ↓                                                            │
  INSERT cats row (+ photo_embedding, computed server-side) ──────┤
                                                                    ↓
                                                    Screen 3a: "You found
                                                    Mr. Falafel!" — cat's
                                                    existing photo, name,
                                                    and status badges
                                                    (TNR'd from
                                                    is_ear_tipped, plus any
                                                    cat_tags)
                                                        ↓
                                                    INSERT sightings row
                                                    (name/tags unchanged —
                                                    a respot is quick, by
                                                    design, less ceremony
                                                    than a new catch)
```

## Matching subsystem

1. Screen 1: photo upload and GPS capture happen in parallel (as today).
2. On reaching Screen 2, call the existing `nearby_cats(lat, lng, radius_km)` SQL function for location-only candidates (up to ~5 shown as cards).
3. **"Not sure" fallback**: a new server-only Route Handler (holds the Hugging Face token, so it can't run client-side):
   - Computes the CLIP embedding for the new photo via Hugging Face's free Inference API
   - Calls a new `nearby_cats_by_similarity(cat_ids, query_embedding, limit_n)` SQL function, passing the IDs of the already-fetched nearby candidates, to re-rank _that same set_ by cosine similarity (`pgvector`'s `<=>` operator)
   - Screen 2 re-renders with the new order — no new screen
4. **Embedding storage**: only computed and stored on a **new catch**. Screen 4b's submit calls a server Route Handler (`app/api/catch-cat/route.ts`), not the Supabase client directly — unlike every other insert in this app so far. That route: (a) computes the CLIP embedding for the already-uploaded photo via Hugging Face, (b) inserts the `cats` row — including `photo_embedding` — using a Supabase server client that forwards the request's auth cookies (same pattern as `lib/supabase/server.ts`, so RLS still applies as the calling user), (c) returns the new cat's id so the client can navigate to confirmation. This is the one exception to "client inserts directly" in this spec, purely because the Hugging Face token can't leave the server. Respots don't need this — they insert into `sightings` directly from the client, same as today's pattern, since no embedding needs computing.
5. Every "Not sure" tap costs one Hugging Face API call (free tier, rate-limited) — acceptable since it's a fallback path, not the default flow.

## Name generator

Format: `{Title} {Word}{Number}` (matches the user's example `mr.evil2639`).

- **Titles** (~10): Mr., Mrs., Lady, Sir, Captain, Duke, Duchess, Professor, Baron, Agent
- **Words** (~18, cat puns): Meowgi, Clawdia, Furocious, Meowzart, Pawsome, Whiskerton, Purrsloth, Catastrophe, Furdinand, Clawdius, Meowington, Pawblo, Purrlock, Whiskerbeard, Clawmander, Fluffernutter, Purrsimmon, Meowses
- **Number**: random 4-digit suffix
- Generated entirely client-side (hardcoded arrays, no API call, no dependency)
- Pre-filled in an editable input on Screen 3b; "🎲 Try another" rerolls both title and word
- No uniqueness check — `cats.name` has no unique constraint, and duplicate silly names are fine (funny, even)

## Medical tags

Scoped strictly to medical/welfare status (not general temperament — "friendly" was considered and dropped). TNR status is **not** duplicated here — it's already `cats.is_ear_tipped`, shown as a "TNR'd" badge on the reveal screen.

Fixed vocabulary (not user-extensible): `needs_medical`, `possible_rabies`, `deceased`. No special-casing for `deceased` (or any tag) beyond storing it — how the map renders/filters tags is a Day 3 decision, deferred.

Captured on Screen 4b (new catch only) — tags aren't editable on existing cats in this spec; that's future work.

## Schema changes

```sql
-- New column on cats
ALTER TABLE cats ADD COLUMN photo_embedding vector(512);

-- New tags table
CREATE TABLE cat_tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id     uuid NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  tag        text NOT NULL CHECK (tag IN ('needs_medical', 'possible_rabies', 'deceased')),
  added_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cat_id, tag)
);
-- RLS: publicly readable, authenticated can insert, the person who added a
-- tag can remove it (no removal UI in this spec — just not painting the DB
-- into a corner where a mistaken tag can never be undone)

-- New function: re-rank already-fetched nearby candidates by embedding similarity
CREATE OR REPLACE FUNCTION nearby_cats_by_similarity(
  cat_ids uuid[],
  query_embedding vector(512),
  limit_n int DEFAULT 5
)
RETURNS TABLE (id uuid, similarity double precision)
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT id, 1 - (photo_embedding <=> query_embedding) AS similarity
  FROM public.cats
  WHERE id = ANY(cat_ids) AND photo_embedding IS NOT NULL
  ORDER BY photo_embedding <=> query_embedding
  LIMIT limit_n;
$$;
```

## New dependencies

- `leaflet` + `react-leaflet` — draggable-pin location override on Screen 1. Free, open-source, OpenStreetMap tiles, no API key. Also sets the map library choice for the Day 3 `/map` page.
- Hugging Face Inference API — called server-side only, via `fetch`, no new npm package required.

## Error handling

- **Photo/GPS missing** — same as the current `/tag`: block submit, toast, retry link for location.
- **`nearby_cats()` fails** — degrade gracefully: treat as "no candidates found," skip to the new-catch flow rather than blocking.
- **"Not sure" → Hugging Face call fails** (rate limit, network, bad token) — silently fall back to the original location-only order + one toast ("Couldn't analyze the photo, showing nearby cats instead"). Never blocks the flow.
- **Embedding storage fails on a new catch** — doesn't block cat creation. The catch (photo, name, details) succeeds regardless; `photo_embedding` stays null for that cat. No user-facing error — surfacing an internal enhancement failure at the celebratory "you caught it!" moment would be a bad beat, so it's a silent server-side skip.
- **Storage upload / DB insert failures** (photo upload, `sightings` insert, `cats` insert) — same as today: toast error, stay on screen, don't navigate away.
- **Session expired mid-flow** — same as today: toast + redirect to `/login`.

## Testing / verification

No test framework exists in this repo (no `npm test` script). Verification is `type-check`/`lint`/`build`, plus whatever can be driven via Playwright without an authenticated session — the whole flow lives behind the proxy's auth guard, and a full live click-through (including the Google-Vision-style "not sure" path, which needs a real second nearby cat to compare against) isn't automatable here without creating throwaway data in the live Supabase project. Manual click-through is recommended as a follow-up, same as prior features this session.

## Explicitly out of scope

- Rendering tags/status as colored pins or filters on `/map` (Day 3 work — this spec only makes the data map-render-ready)
- Editing tags or details on existing (already-caught) cats
- Any special behavior for the `deceased` tag beyond storing it
- A UI for removing tags (the RLS policy allows it; no screen built for it)
- Real vision-based color/pattern description (e.g. Gemini) — using CLIP embeddings + pgvector instead, per the user's choice
