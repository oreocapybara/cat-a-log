# Shareable Catch Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a distinct, shareable "Pokemon card, modern theme" image at the moment of every catch — a gold "New Species" card for a brand-new cat, a tier-colored card for a repeat sighting — and let the user share or download it right there in the flow.

**Architecture:** Extend the existing `next/og` `ImageResponse` pattern from `app/api/profile-card/[username]/route.tsx` into a new `app/api/catch-card/route.tsx` that takes `?catId=` (new cat) or `?sightingId=` (repeat sighting). A deterministic seed (hash of the id → mulberry32 PRNG) drives a per-catch foil shimmer angle/offset so the same catch always renders identically but no two catches line up. The existing tier system (`lib/sighting-tiers.ts`) gets one new pure export (`getNextTierThreshold`) so both card variants can show "N more sightings to level up" via the same progress-bar mechanism — a brand-new cat is simply `timesSpotted = 1` running through the identical code path. The share interaction (`fetch → blob → File → navigator.share`/download-fallback) already exists in `share-profile-button.tsx`; it gets extracted into `lib/share-image.ts` so a new shared `CatchCardShareButton` can reuse it without duplicating the Web Share API dance.

**Tech Stack:** Next.js 16 App Router (Route Handlers), `next/og` `ImageResponse` (Satori), Supabase JS client, Tailwind v4 (`motion-safe:animate-in` utilities already used elsewhere in this codebase), `sonner` toasts, `lucide-react` icons.

## Global Constraints

- TypeScript strict mode — no `any`, no unchecked nullables.
- No semicolons, single quotes, 2-space indent, trailing commas (ES5 style) — Prettier auto-formats on commit via lint-staged, but write code in this style directly.
- Server Supabase client: `import { createClient } from '@/lib/supabase/server'` (async, must be awaited). Never construct a Supabase client inline.
- `HUGGINGFACE_API_TOKEN` is irrelevant here — not touched by this feature.
- Component placement: a component used by exactly one page/route lives in that route's own `components/` folder; a component shared across route groups lives at the top level (`app/components/`, matching the existing precedent of `app/components/google-button.tsx`) — not in `components/ui/`, which is reserved for cross-cutting design-system primitives.
- Toasts via `sonner`'s `toast.success()` / `toast.error()`.
- Commits follow Conventional Commits (`feat(tag): ...`, `feat(map): ...`, etc.), subject lowercase after the colon, no trailing period, under 72 chars.
- No test runner is configured in this repo (no Jest/Vitest). Pure-logic modules get a `*.selfcheck.mts` script (see `lib/clustering.selfcheck.mts` for the existing convention), run manually via `npx tsx <file>`. Everything else (routes, UI) is verified manually against a running dev server.

---

### Task 1: Deterministic per-catch foil seed

**Files:**

- Create: `lib/catch-card-seed.ts`
- Create: `lib/catch-card-seed.selfcheck.mts`

**Interfaces:**

- Produces: `getCatchCardFoil(id: string): { angleDeg: number; offsetPercent: number }` — `angleDeg` in `[100, 130]`, `offsetPercent` in `[25, 75]`. Pure function, same `id` always returns the same result.

- [ ] **Step 1: Write `lib/catch-card-seed.ts`**

```ts
// A given catch (cat id or sighting id) always renders the same foil
// angle/offset — stable across re-fetches and re-shares — while different
// catches land on different values. mulberry32 seeded from a simple string
// hash of the id; no crypto needed, this only drives a CSS gradient angle.
function hashSeed(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (Math.imul(31, hash) + id.charCodeAt(i)) | 0
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type CatchCardFoil = {
  angleDeg: number
  offsetPercent: number
}

export function getCatchCardFoil(id: string): CatchCardFoil {
  const rand = mulberry32(hashSeed(id))
  return {
    angleDeg: 100 + rand() * 30,
    offsetPercent: 25 + rand() * 50,
  }
}
```

- [ ] **Step 2: Write `lib/catch-card-seed.selfcheck.mts`**

```ts
import assert from 'node:assert/strict'
import { getCatchCardFoil } from './catch-card-seed.ts'

const idA = '11111111-1111-1111-1111-111111111111'
const idB = '22222222-2222-2222-2222-222222222222'

const a1 = getCatchCardFoil(idA)
const a2 = getCatchCardFoil(idA)
assert.equal(a1.angleDeg, a2.angleDeg, 'same id yields same angle')
assert.equal(a1.offsetPercent, a2.offsetPercent, 'same id yields same offset')

const b = getCatchCardFoil(idB)
assert.ok(
  a1.angleDeg !== b.angleDeg || a1.offsetPercent !== b.offsetPercent,
  'different ids produce different foil'
)

assert.ok(a1.angleDeg >= 100 && a1.angleDeg <= 130, 'angle within [100, 130]')
assert.ok(a1.offsetPercent >= 25 && a1.offsetPercent <= 75, 'offset within [25, 75]')

console.log('catch-card-seed.selfcheck: OK')
```

- [ ] **Step 3: Run the self-check**

Run: `npx tsx lib/catch-card-seed.selfcheck.mts`
Expected: `catch-card-seed.selfcheck: OK` with no assertion errors.

- [ ] **Step 4: Commit**

```bash
git add lib/catch-card-seed.ts lib/catch-card-seed.selfcheck.mts
git commit -m "feat(tag): add deterministic per-catch foil seed helper"
```

---

### Task 2: Next-tier progress helper

**Files:**

- Modify: `lib/sighting-tiers.ts`
- Create: `lib/sighting-tiers.selfcheck.mts`

**Interfaces:**

- Consumes: nothing new — reuses the existing `TIERS` table already in this file.
- Produces: `getNextTierThreshold(timesSpotted: number): number | null` — the `timesSpotted` value at which the next tier unlocks, or `null` if already at the max tier.

- [ ] **Step 1: Add the export to `lib/sighting-tiers.ts`**

Add after the existing `TIERS` array (the file already exports `getSightingTier`; this is a sibling export, not a replacement):

```ts
const TIER_THRESHOLDS = [2, 5, 10, 20, 50]

export function getNextTierThreshold(timesSpotted: number): number | null {
  return TIER_THRESHOLDS.find((threshold) => timesSpotted < threshold) ?? null
}
```

- [ ] **Step 2: Write `lib/sighting-tiers.selfcheck.mts`**

```ts
import assert from 'node:assert/strict'
import { getNextTierThreshold, getSightingTier } from './sighting-tiers.ts'

assert.equal(getNextTierThreshold(1), 2, 'a fresh catch (1) is due at tier-2 threshold')
assert.equal(getNextTierThreshold(2), 5, 'exactly at a threshold looks at the next one')
assert.equal(getNextTierThreshold(49), 50, 'just under the max threshold')
assert.equal(getNextTierThreshold(50), null, 'at the max threshold, no next tier')
assert.equal(getNextTierThreshold(1000), null, 'well past the max threshold, no next tier')

assert.equal(getSightingTier(1).name, 'Stray', 'sanity check against existing tier function')

console.log('sighting-tiers.selfcheck: OK')
```

- [ ] **Step 3: Run the self-check**

Run: `npx tsx lib/sighting-tiers.selfcheck.mts`
Expected: `sighting-tiers.selfcheck: OK` with no assertion errors.

- [ ] **Step 4: Commit**

```bash
git add lib/sighting-tiers.ts lib/sighting-tiers.selfcheck.mts
git commit -m "feat(tag): add next-tier threshold helper for progress bars"
```

---

### Task 3: Catch card API route

**Files:**

- Create: `app/api/catch-card/route.tsx`

**Interfaces:**

- Consumes: `getCatchCardFoil(id: string)` from Task 1 (`@/lib/catch-card-seed`); `getSightingTier(timesSpotted: number)` and `getNextTierThreshold(timesSpotted: number)` from Task 2 (`@/lib/sighting-tiers`); `createClient()` from `@/lib/supabase/server`.
- Produces: `GET /api/catch-card?catId=<uuid>` and `GET /api/catch-card?sightingId=<uuid>` — both return a `1080×1920` PNG (`ImageResponse`). 400 if zero or both params are present; 404 if the id doesn't resolve to a row.

This is a route handler, not a pure function — there's no test runner in this repo for HTTP handlers, so verification is manual (Step 4 below) rather than an automated test, matching how `app/api/profile-card/[username]/route.tsx` was built.

- [ ] **Step 1: Write `app/api/catch-card/route.tsx`**

```tsx
import { ImageResponse } from 'next/og'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSightingTier, getNextTierThreshold } from '@/lib/sighting-tiers'
import { getCatchCardFoil } from '@/lib/catch-card-seed'

const NEW_DISCOVERY_COLOR = '#eab308'

type CardData = {
  photoUrl: string
  catName: string
  badgeLabel: string
  badgeColor: string
  rarityDots: number // 0 disables the dots and shows sequenceLabel instead
  sequenceLabel: string
  subline: string
  progressLabel: string
  progressFraction: number
  progressCaption: string
  extraCaption: string | null
  footerLabel: string
  footerAvatarUrl: string | null
  foilAngle: number
  foilOffset: number
}

function buildProgress(timesSpotted: number, catName: string) {
  const nextThreshold = getNextTierThreshold(timesSpotted)
  const nextTier = nextThreshold ? getSightingTier(nextThreshold) : null
  const fraction = nextThreshold ? timesSpotted / nextThreshold : 1
  const label = nextTier ? `Next tier: ${nextTier.name}` : 'Max tier reached'
  const remaining = nextThreshold ? nextThreshold - timesSpotted : 0
  const caption = nextThreshold
    ? `${remaining} more sighting${remaining === 1 ? '' : 's'} to level ${catName} up`
    : `${catName} has reached the top tier`
  return { fraction, label, caption }
}

export async function GET(request: NextRequest) {
  const catId = request.nextUrl.searchParams.get('catId')
  const sightingId = request.nextUrl.searchParams.get('sightingId')

  if ((!catId && !sightingId) || (catId && sightingId)) {
    return NextResponse.json(
      { error: 'Provide exactly one of catId or sightingId' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  let data: CardData

  if (catId) {
    const { data: cat } = await supabase
      .from('cats')
      .select('id, name, primary_photo_url, tagged_by, created_at')
      .eq('id', catId)
      .single()

    if (!cat) {
      return NextResponse.json({ error: 'Cat not found' }, { status: 404 })
    }

    let taggerUsername = 'a new tagger'
    let taggerAvatarUrl: string | null = null
    if (cat.tagged_by) {
      const { data: tagger } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', cat.tagged_by)
        .single()
      if (tagger) {
        taggerUsername = tagger.username
        taggerAvatarUrl = tagger.avatar_url
      }
    }

    const { count: registryNumber } = await supabase
      .from('cats')
      .select('id', { count: 'exact', head: true })
      .lte('created_at', cat.created_at)

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count: weekCount } = await supabase
      .from('cats')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo)

    const catName = cat.name ?? 'Your cat'
    const spottedDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(cat.created_at))
    const progress = buildProgress(1, catName)
    const weekTotal = weekCount ?? 1

    const foil = getCatchCardFoil(catId)
    data = {
      photoUrl: cat.primary_photo_url,
      catName,
      badgeLabel: '✨ New Species',
      badgeColor: NEW_DISCOVERY_COLOR,
      rarityDots: 0,
      sequenceLabel: `#${registryNumber ?? 1}`,
      subline: `First spotted ${spottedDate}`,
      progressLabel: progress.label,
      progressFraction: progress.fraction,
      progressCaption: progress.caption,
      extraCaption: `${weekTotal} cat${weekTotal === 1 ? '' : 's'} tagged this week`,
      footerLabel: `@${taggerUsername} discovered this`,
      footerAvatarUrl: taggerAvatarUrl,
      foilAngle: foil.angleDeg,
      foilOffset: foil.offsetPercent,
    }
  } else {
    const { data: sighting } = await supabase
      .from('sightings')
      .select('id, cat_id, photo_url, spotted_by')
      .eq('id', sightingId!)
      .single()

    if (!sighting) {
      return NextResponse.json({ error: 'Sighting not found' }, { status: 404 })
    }

    const { data: cat } = await supabase
      .from('cats')
      .select('id, name')
      .eq('id', sighting.cat_id)
      .single()

    if (!cat) {
      return NextResponse.json({ error: 'Cat not found' }, { status: 404 })
    }

    const { count: sightingCount } = await supabase
      .from('sightings')
      .select('id', { count: 'exact', head: true })
      .eq('cat_id', cat.id)

    const timesSpotted = 1 + (sightingCount ?? 0)
    const tier = getSightingTier(timesSpotted)

    let spotterUsername = 'someone'
    let spotterAvatarUrl: string | null = null
    if (sighting.spotted_by) {
      const { data: spotter } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', sighting.spotted_by)
        .single()
      if (spotter) {
        spotterUsername = spotter.username
        spotterAvatarUrl = spotter.avatar_url
      }
    }

    const catName = cat.name ?? 'This cat'
    const progress = buildProgress(timesSpotted, catName)

    const foil = getCatchCardFoil(sightingId!)
    data = {
      photoUrl: sighting.photo_url,
      catName,
      badgeLabel: tier.name,
      badgeColor: tier.color,
      rarityDots: tier.tier,
      sequenceLabel: '',
      subline: `Spotted ${timesSpotted}× by the community`,
      progressLabel: progress.label,
      progressFraction: progress.fraction,
      progressCaption: progress.caption,
      extraCaption: null,
      footerLabel: `@${spotterUsername} spotted this`,
      footerAvatarUrl: spotterAvatarUrl,
      foilAngle: foil.angleDeg,
      foilOffset: foil.offsetPercent,
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090b',
          padding: '80px 56px',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            borderRadius: 36,
            padding: 6,
            background: `linear-gradient(135deg, ${data.badgeColor}, ${data.badgeColor}80, ${data.badgeColor}40, ${data.badgeColor}80, ${data.badgeColor})`,
            boxShadow: `0 0 40px ${data.badgeColor}30, inset 0 0 40px ${data.badgeColor}08`,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 30,
              overflow: 'hidden',
              backgroundColor: '#18181b',
              border: '2px solid rgba(255,255,255,0.06)',
              position: 'relative',
            }}
          >
            {/* foil shimmer — stripes + sweep, angle/offset seeded per catch */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                background: `repeating-linear-gradient(${data.foilAngle}deg, transparent 0px, transparent 14px, ${data.badgeColor}26 14px, ${data.badgeColor}26 18px, transparent 18px, transparent 32px)`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                background: `linear-gradient(${data.foilAngle}deg, transparent ${data.foilOffset - 15}%, rgba(255,255,255,0.12) ${data.foilOffset}%, transparent ${data.foilOffset + 15}%)`,
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '22px 28px 14px',
                position: 'relative',
              }}
            >
              <span
                style={{
                  color: data.badgeColor,
                  fontSize: 20,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {data.badgeLabel}
              </span>
              {data.rarityDots > 0 ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        backgroundColor:
                          i <= data.rarityDots ? data.badgeColor : 'rgba(255,255,255,0.08)',
                      }}
                    />
                  ))}
                </div>
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: 700 }}>
                  {data.sequenceLabel}
                </span>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                position: 'relative',
                margin: '0 20px',
                borderRadius: 20,
                overflow: 'hidden',
                height: '44%',
                border: `3px solid ${data.badgeColor}40`,
                boxShadow: 'inset 0 0 30px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.photoUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  background:
                    'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                padding: '20px 28px 22px',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ color: 'white', fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>
                  {data.catName}
                </span>
                <span style={{ color: data.badgeColor, fontSize: 20, fontWeight: 600 }}>
                  {data.subline}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
                <span
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {data.progressLabel}
                </span>
                <div
                  style={{
                    display: 'flex',
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: 8,
                    height: 10,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      width: `${Math.round(data.progressFraction * 100)}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${data.badgeColor}, ${data.badgeColor}cc)`,
                    }}
                  />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                  {data.progressCaption}
                </span>
                {data.extraCaption && (
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 }}>
                    {data.extraCaption}
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: `1px solid ${data.badgeColor}15`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {data.footerAvatarUrl ? (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        overflow: 'hidden',
                        display: 'flex',
                        border: `2px solid ${data.badgeColor}30`,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={data.footerAvatarUrl}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        backgroundColor: '#f97316',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      🐾
                    </div>
                  )}
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: 600 }}>
                    {data.footerLabel}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>🐾</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, fontWeight: 600 }}>
                    cat-a-log.app
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    }
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: 0 errors (the two `<img>` warnings are expected and match the existing `profile-card` route).

- [ ] **Step 4: Manual verification against a running dev server**

Run: `npm run dev`, then in a browser (while logged in) visit:

- `http://localhost:3000/api/catch-card?catId=<a real cat id from your dev database>` — expect a gold "✨ New Species" card image.
- `http://localhost:3000/api/catch-card?sightingId=<a real sighting id>` — expect a tier-colored card image.
- `http://localhost:3000/api/catch-card` (no params) — expect a 400 JSON error.
- `http://localhost:3000/api/catch-card?catId=x&sightingId=y` — expect a 400 JSON error.
- `http://localhost:3000/api/catch-card?catId=00000000-0000-0000-0000-000000000000` — expect a 404 JSON error.

- [ ] **Step 5: Commit**

```bash
git add app/api/catch-card/route.tsx
git commit -m "feat(tag): add catch card image API route"
```

---

### Task 4: Make the catch card route publicly reachable

**Files:**

- Modify: `proxy.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: nothing new — this only changes routing policy.

- [ ] **Step 1: Add the prefix**

In `proxy.ts`, find:

```ts
const PUBLIC_PREFIXES = ['/profile/', '/api/profile-card/']
```

Change to:

```ts
const PUBLIC_PREFIXES = ['/profile/', '/api/profile-card/', '/api/catch-card']
```

- [ ] **Step 2: Manual verification**

With the dev server running, open an incognito/private browser window (no session cookie) and visit `http://localhost:3000/api/catch-card?catId=<a real cat id>`.
Expected: the card image renders directly — no redirect to `/login`.

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "feat(map): allow unauthenticated access to catch card images"
```

---

### Task 5: Extract the shared share-image helper

**Files:**

- Create: `lib/share-image.ts`
- Modify: `app/(app)/profile/[username]/components/share-profile-button.tsx`

**Interfaces:**

- Produces: `shareCardImage(options: { cardUrl: string; downloadFilename: string; shareTitle: string; shareText: string; shareUrl: string }): Promise<void>` — fetches the card image, tries the native share sheet with the image file, falls back to triggering a download. Throws on fetch failure or an aborted share (caller distinguishes `AbortError` to stay silent on user-cancel).

This task is a pure refactor — `ShareProfileButton`'s behavior must not change. There's no automated test for this (it's browser-API-driven UI code, same as the original), so verification is manual: the existing profile share button must still work exactly as before.

- [ ] **Step 1: Write `lib/share-image.ts`**

```ts
import { toast } from 'sonner'

export async function shareCardImage(options: {
  cardUrl: string
  downloadFilename: string
  shareTitle: string
  shareText: string
  shareUrl: string
}): Promise<void> {
  const { cardUrl, downloadFilename, shareTitle, shareText, shareUrl } = options

  const res = await fetch(cardUrl)
  if (!res.ok) throw new Error('Failed to generate card')
  const blob = await res.blob()
  const file = new File([blob], downloadFilename, { type: 'image/png' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: shareTitle, text: shareText, url: shareUrl })
    return
  }

  // Desktop fallback: download the image
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = downloadFilename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast.success('Card downloaded!')
}
```

- [ ] **Step 2: Refactor `share-profile-button.tsx` to use it**

Replace the current `handleShareImage` function body:

```ts
async function handleShareImage() {
  setOpen(false)
  setLoading(true)
  const cardUrl = `/api/profile-card/${username}`
  const profileUrl = `${window.location.origin}/profile/${username}`

  try {
    const res = await fetch(cardUrl)
    if (!res.ok) throw new Error('Failed to generate card')
    const blob = await res.blob()
    const file = new File([blob], `${username}-cat-a-log.png`, { type: 'image/png' })

    // Try native share with image (mobile)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `@${username} on Cat-A-Log`,
        text: `Check out @${username} on Cat-A-Log 🐾`,
        url: profileUrl,
      })
    } else {
      // Desktop fallback: download the image
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${username}-cat-a-log.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Card downloaded!')
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // User cancelled — no-op
    } else {
      toast.error('Could not share card')
    }
  } finally {
    setLoading(false)
  }
}
```

with:

```ts
async function handleShareImage() {
  setOpen(false)
  setLoading(true)

  try {
    await shareCardImage({
      cardUrl: `/api/profile-card/${username}`,
      downloadFilename: `${username}-cat-a-log.png`,
      shareTitle: `@${username} on Cat-A-Log`,
      shareText: `Check out @${username} on Cat-A-Log 🐾`,
      shareUrl: `${window.location.origin}/profile/${username}`,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // User cancelled — no-op
    } else {
      toast.error('Could not share card')
    }
  } finally {
    setLoading(false)
  }
}
```

Add the import at the top of the file:

```ts
import { shareCardImage } from '@/lib/share-image'
```

- [ ] **Step 3: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual regression check**

Run: `npm run dev`, sign in, visit any `/profile/<username>` you own, click the share icon → "Share as image". Confirm it still downloads (desktop) or opens the native share sheet (mobile emulation) exactly as before.

- [ ] **Step 5: Commit**

```bash
git add lib/share-image.ts "app/(app)/profile/[username]/components/share-profile-button.tsx"
git commit -m "refactor(profile): extract shared share-image helper"
```

---

### Task 6: Shared catch-card share button

**Files:**

- Create: `app/components/catch-card-share-button.tsx`

**Interfaces:**

- Consumes: `shareCardImage` from `@/lib/share-image` (Task 5).
- Produces: `<CatchCardShareButton cardUrl={string} downloadFilename={string} shareTitle={string} shareText={string} sharePath={string} />` — a full-width primary button; `sharePath` is a relative path (e.g. `/map?cat=abc`), turned into an absolute URL inside the click handler (never at render time, so it's safe during the server-rendered first pass of this client component).

- [ ] **Step 1: Write `app/components/catch-card-share-button.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Loader2, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { shareCardImage } from '@/lib/share-image'

export function CatchCardShareButton({
  cardUrl,
  downloadFilename,
  shareTitle,
  shareText,
  sharePath,
}: {
  cardUrl: string
  downloadFilename: string
  shareTitle: string
  shareText: string
  sharePath: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleShare() {
    setLoading(true)
    try {
      await shareCardImage({
        cardUrl,
        downloadFilename,
        shareTitle,
        shareText,
        shareUrl: `${window.location.origin}${sharePath}`,
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled — no-op
      } else {
        toast.error('Could not share card')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      className="w-full rounded-xl py-6 text-base font-semibold"
      disabled={loading}
      onClick={handleShare}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing card…
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          Share this catch
        </span>
      )}
    </Button>
  )
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: no errors. (This component has no callers yet — that's Tasks 7 and 8 — so there's nothing to manually exercise until then.)

- [ ] **Step 3: Commit**

```bash
git add app/components/catch-card-share-button.tsx
git commit -m "feat(tag): add shared catch card share button"
```

---

### Task 7: New-cat catch-complete screen

**Files:**

- Create: `app/(auth)/tag/complete/page.tsx`
- Modify: `app/(auth)/tag/flush/page.tsx`

**Interfaces:**

- Consumes: `CatchCardShareButton` from `@/app/components/catch-card-share-button` (Task 6); reads `catId` and `name` from the URL's query string via `window.location.search` (same pattern already used in `app/(app)/map/page.tsx:95`, which avoids the `useSearchParams` Suspense-boundary requirement).
- Produces: route `/tag/complete?catId=<uuid>&name=<url-encoded name>`.

- [ ] **Step 1: Update the redirect in `app/(auth)/tag/flush/page.tsx`**

Find:

```ts
const { catId } = (await response.json()) as { catId: string }
await clearPendingTag()
toast.success(`${pending.tag.name} was caught! 🐱`)
router.replace(`/map?cat=${catId}`)
```

Replace with:

```ts
const { catId } = (await response.json()) as { catId: string }
await clearPendingTag()
router.replace(`/tag/complete?catId=${catId}&name=${encodeURIComponent(pending.tag.name)}`)
```

(The `toast.success` is dropped here — the new `/tag/complete` screen itself is the celebration moment, so a second, separate toast on top of it would be redundant.)

- [ ] **Step 2: Write `app/(auth)/tag/complete/page.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CatchCardShareButton } from '@/app/components/catch-card-share-button'

export default function TagCompletePage() {
  const router = useRouter()
  const [catId, setCatId] = useState<string | null>(null)
  const [name, setName] = useState('your cat')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('catId')
    if (!id) {
      router.replace('/map')
      return
    }
    setCatId(id)
    setName(params.get('name') ?? 'your cat')
    setReady(true)
  }, [router])

  if (!ready || !catId) return null

  const cardUrl = `/api/catch-card?catId=${catId}`

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-4 py-8 text-center">
      <h1 className="font-heading text-2xl font-bold tracking-tight">You found {name}!</h1>
      <p className="text-muted-foreground mt-1 text-sm">Added to the registry. Show it off.</p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cardUrl}
        alt={`${name}'s catch card`}
        className="border-border motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 mt-6 w-full max-w-xs rounded-2xl border shadow-lg motion-safe:duration-500"
      />

      <div className="mt-8 w-full max-w-sm space-y-3">
        <CatchCardShareButton
          cardUrl={cardUrl}
          downloadFilename={`${name}-catch-card.png`}
          shareTitle={`I found ${name} on Cat-A-Log`}
          shareText={`I just tagged ${name} on Cat-A-Log 🐾`}
          sharePath={`/map?cat=${catId}`}
        />
        <button
          type="button"
          onClick={() => router.push(`/map?cat=${catId}`)}
          className="text-muted-foreground text-sm underline underline-offset-4"
        >
          Back to the map
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add the route to `proxy.ts`'s public routes (mid-flow, unauthenticated users can briefly land here)**

Check first whether this is actually needed: `/tag/complete` is only reached right after `/tag/flush`, which requires a signed-in `user` (it redirects to `/login` otherwise) — so by the time `/tag/complete` loads, the user is always authenticated. **Do not add it to `PUBLIC_ROUTES`.** (This step exists to make that reasoning explicit in the diff's commit — no code change here.)

- [ ] **Step 4: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual verification — full new-cat flow**

Run: `npm run dev`. Sign in, go to `/tag`, take/upload a photo of a cat with no visual match, name it, fill details, save. Confirm:

- You land on `/tag/complete?catId=...&name=...` (not `/map` directly).
- The card fades/scales in, shows the gold "✨ New Species" badge, the cat's name and photo.
- "Share this catch" triggers the share sheet (mobile) or downloads a PNG (desktop).
- "Back to the map" navigates to `/map?cat=<id>` and the cat is visible there.

- [ ] **Step 6: Commit**

```bash
git add "app/(auth)/tag/complete/page.tsx" "app/(auth)/tag/flush/page.tsx"
git commit -m "feat(tag): add catch-complete screen with shareable card for new cats"
```

---

### Task 8: Existing-cat catch card in `MatchFoundScreen`

**Files:**

- Modify: `app/(app)/tag/components/match-found-screen.tsx`

**Interfaces:**

- Consumes: `CatchCardShareButton` from `@/app/components/catch-card-share-button` (Task 6).
- Produces: nothing new externally — this is a leaf UI change.

- [ ] **Step 1: Capture the new sighting's id**

Find the sighting insert inside `recordSighting`:

```ts
const { error } = await supabase.from('sightings').insert({
  cat_id: cat.id,
  photo_url: photoUrl,
  lat,
  lng,
  spotted_by: user.id,
})

if (error) {
  toast.error(error.message)
}

setSaving(false)
```

Replace with:

```ts
const { data: sightingRow, error } = await supabase
  .from('sightings')
  .insert({
    cat_id: cat.id,
    photo_url: photoUrl,
    lat,
    lng,
    spotted_by: user.id,
  })
  .select('id')
  .single()

if (error) {
  toast.error(error.message)
} else if (sightingRow) {
  setSightingId(sightingRow.id)
}

setSaving(false)
```

- [ ] **Step 2: Add the `sightingId` state**

Find:

```ts
const [tags, setTags] = useState<CatTag[]>([])
const [saving, setSaving] = useState(true)
const [showContent, setShowContent] = useState(false)
```

Replace with:

```ts
const [tags, setTags] = useState<CatTag[]>([])
const [saving, setSaving] = useState(true)
const [showContent, setShowContent] = useState(false)
const [sightingId, setSightingId] = useState<string | null>(null)
```

- [ ] **Step 3: Add the import**

At the top of the file, alongside the other imports:

```ts
import { CatchCardShareButton } from '@/app/components/catch-card-share-button'
```

- [ ] **Step 4: Render the card once the sighting is saved**

Find the end of the "Status badges" block, where it closes the staggered-content wrapper `<div>`:

```tsx
            {tags.map((tag) => {
              const info = TAG_LABELS[tag.tag] ?? { label: tag.tag, emoji: '🏷️' }
              return (
                <span
                  key={tag.id}
                  className="bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                >
                  {info.emoji} {info.label}
                </span>
              )
            })}
          </div>
        )}
      </div>
```

Replace with (adds the catch card block right after the status badges, still inside the same staggered-content `<div>`):

```tsx
            {tags.map((tag) => {
              const info = TAG_LABELS[tag.tag] ?? { label: tag.tag, emoji: '🏷️' }
              return (
                <span
                  key={tag.id}
                  className="bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                >
                  {info.emoji} {info.label}
                </span>
              )
            })}
          </div>
        )}

        {/* Catch card */}
        {sightingId && (
          <div className="mt-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/catch-card?sightingId=${sightingId}`}
              alt={`${cat.name ?? 'This cat'}'s catch card`}
              className="border-border motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 w-full max-w-[220px] rounded-2xl border shadow-lg motion-safe:duration-500"
            />
          </div>
        )}
      </div>
```

- [ ] **Step 5: Add the share button above the existing CTA**

Find:

```tsx
      {/* CTA */}
      <div className="mt-8 w-full">
        <Button
```

Replace with:

```tsx
      {/* CTA */}
      <div className="mt-8 w-full space-y-3">
        {sightingId && (
          <CatchCardShareButton
            cardUrl={`/api/catch-card?sightingId=${sightingId}`}
            downloadFilename={`${cat.name ?? 'cat'}-catch-card.png`}
            shareTitle={`I spotted ${cat.name ?? 'a cat'} on Cat-A-Log`}
            shareText={`I just spotted ${cat.name ?? 'a cat'} again on Cat-A-Log 🐾`}
            sharePath={`/map?cat=${cat.id}`}
          />
        )}
        <Button
```

(The existing `<Button>...Back to the map</Button>` JSX and its closing tags below are unchanged — only the wrapping `<div>`'s class and the new sibling above it are new.)

- [ ] **Step 6: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 7: Manual verification — full existing-cat flow**

Run: `npm run dev`. Tag a photo that visually matches an already-tagged cat (or use the candidates screen to force a match). Confirm:

- The success screen still shows immediately (no new loading delay).
- Once the sighting finishes saving, the tier-colored catch card fades/scales in below the status badges.
- "Share this catch" works (share sheet or download).
- "Back to the map" still works as before.

- [ ] **Step 8: Commit**

```bash
git add "app/(app)/tag/components/match-found-screen.tsx"
git commit -m "feat(tag): show shareable catch card on repeat sightings"
```
