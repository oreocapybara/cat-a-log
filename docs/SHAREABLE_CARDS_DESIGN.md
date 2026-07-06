# Shareable Cards — Design System

Cat-A-Log has two shareable card types: **Profile Cards** and **Catch Cards**. Both share a unified visual system ("holographic game card" aesthetic) rendered server-side as 1080×1920 PNG images via `next/og` `ImageResponse`.

## Visual system — shared foundations

Both card types follow the same structural skeleton:

```
┌─────────────────────────────── Dark surround (#09090b) ──────────────────────────────┐
│   padding: 80px 56px                                                                  │
│   ┌───────────────────────── Holographic border ─────────────────────────┐            │
│   │   6px gradient (tier/badge color → transparent → back)                │            │
│   │   ┌───────────────────── Inner card body (#18181b) ───────────────┐  │            │
│   │   │   border-radius: 30px                                          │  │            │
│   │   │   inner border: 2px solid rgba(255,255,255,0.06)               │  │            │
│   │   │                                                                │  │            │
│   │   │   ┌── Header: badge/tier label + rarity dots or # ──┐         │  │            │
│   │   │   └──────────────────────────────────────────────────┘         │  │            │
│   │   │   ┌── Illustration window (44% height) ─────────────┐         │  │            │
│   │   │   │   Photo, object-fit: cover                        │         │  │            │
│   │   │   │   Corner vignette overlay                         │         │  │            │
│   │   │   │   Border: 3px solid {color}40                     │         │  │            │
│   │   │   └──────────────────────────────────────────────────┘         │  │            │
│   │   │   ┌── Info panel (flex-1) ───────────────────────────┐         │  │            │
│   │   │   │   Name (40px, bold, white)                        │         │  │            │
│   │   │   │   Subline (20px, badge color)                     │         │  │            │
│   │   │   │   [Stats / Progress bar]                          │         │  │            │
│   │   │   │   [Collection strip — profile only]               │         │  │            │
│   │   │   │   Footer: avatar + @username + 🐾 cat-a-log.app  │         │  │            │
│   │   │   └──────────────────────────────────────────────────┘         │  │            │
│   │   └────────────────────────────────────────────────────────────────┘  │            │
│   └───────────────────────────────────────────────────────────────────────┘            │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

### Constants

| Property              | Value                                                 |
| --------------------- | ----------------------------------------------------- |
| Dimensions            | 1080 × 1920px (9:16 story)                            |
| Outer background      | `#09090b` (near-black)                                |
| Outer padding         | 80px top/bottom, 56px sides                           |
| Outer border radius   | 36px                                                  |
| Border thickness      | 6px (gradient fill)                                   |
| Inner card background | `#18181b`                                             |
| Inner border radius   | 30px                                                  |
| Inner stroke          | 2px solid `rgba(255,255,255,0.06)`                    |
| Illustration height   | 44% of inner card                                     |
| Illustration radius   | 20px                                                  |
| Photo border          | 3px solid `{tierColor}40`                             |
| Vignette              | radial-gradient, transparent center → 50% black edges |
| Cache                 | `public, max-age=3600, stale-while-revalidate=86400`  |

### Typography (within cards)

All text is inline-styled (no external CSS in `ImageResponse`). The type scale:

| Element          | Size | Weight | Color                                               |
| ---------------- | ---- | ------ | --------------------------------------------------- |
| Badge/tier label | 20px | 800    | `{badgeColor}`, uppercase, 0.1em tracking           |
| Name             | 40px | 800    | White, line-height 1.1                              |
| Subline          | 20px | 600    | `{badgeColor}`                                      |
| Stat value       | 28px | 800    | White (or badge color if highlighted)               |
| Stat label       | 12px | 600    | `rgba(255,255,255,0.45)`, uppercase, 0.1em tracking |
| Footer username  | 16px | 600    | `rgba(255,255,255,0.6)`                             |
| Branding         | 14px | 600    | `rgba(255,255,255,0.35)`                            |
| Progress label   | 12px | 700    | `rgba(255,255,255,0.5)`, uppercase                  |
| Progress caption | 13px | 400    | `rgba(255,255,255,0.35)`                            |

### Color system — tier-driven

The holographic border, badge label, rarity dots, subline text, and progress bar all derive from a single color per card: the **badge color**. This creates visual unity. The tier colors come from `lib/sighting-tiers.ts`:

| Tier | Name            | Color     | Glow? |
| ---- | --------------- | --------- | ----- |
| 1    | Stray           | `#64748b` | No    |
| 2    | Lurker          | `#78716c` | No    |
| 3    | Regular         | `#eab308` | No    |
| 4    | Local Celebrity | `#f97316` | No    |
| 5    | Street Royalty  | `#ef4444` | No    |
| 6    | Urban Legend    | `#fbbf24` | Yes   |

New-discovery cards use a fixed gold: `#eab308`.

Profile cards use the hero cat's tier color (or `#94a3b8` fallback if no cats).

### Glow

When the tier has `glow: true` (Urban Legend only):

- Outer box-shadow: `0 0 60px {color}40, 0 0 120px {color}20, inset 0 0 60px {color}10`
- Badge label text-shadow: `0 0 10px {color}80`
- Name text-shadow: `0 0 20px {color}60`

Non-glow tiers get a subtler shadow: `0 0 30px {color}20, inset 0 0 30px {color}05`

### Holographic border gradient

```
linear-gradient(135deg, {color}, {color}80, {color}40, {color}80, {color})
```

A 5-stop gradient that creates the "shimmer edge" illusion at rest in a static image.

---

## Profile Card

**Route:** `GET /api/profile-card/[username]`  
**File:** `app/api/profile-card/[username]/route.tsx`

### Data fetched

- Profile: username, avatar_url, bio, featured_cat_id
- All cats tagged by this user (name, primary_photo_url)
- Sighting counts per cat → determines hero cat tier
- Hero cat: featured cat if set, otherwise most-sighted cat

### Unique elements (not on catch cards)

| Element          | Description                                                                |
| ---------------- | -------------------------------------------------------------------------- |
| Stats panel      | Three-column strip: Discovered / Sightings / Tier                          |
| Collection strip | Up to 4 thumbnail squares (64×64, radius 12) of other cats + "+N" overflow |
| Rarity dots      | Always 6 dots, filled to current tier level                                |

### Footer

Left: avatar circle (36px) + `@username`  
Right: 🐾 + `cat-a-log.app`

---

## Catch Card

**Route:** `GET /api/catch-card?catId=<uuid>` or `GET /api/catch-card?sightingId=<uuid>`  
**File:** `app/api/catch-card/route.tsx`

### Two variants

| Variant            | Trigger                          | Badge            | Border color   | Dots?                                   |
| ------------------ | -------------------------------- | ---------------- | -------------- | --------------------------------------- |
| **New discovery**  | `?catId=` (first-ever sighting)  | "✨ New Species" | Gold `#eab308` | No — shows `#N` registry number instead |
| **Existing catch** | `?sightingId=` (repeat sighting) | Tier name        | Tier color     | Yes, filled to tier                     |

### Unique elements (not on profile cards)

| Element          | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| Foil shimmer     | Two overlay layers (stripes + sweep), seeded per catch id   |
| Progress bar     | Shows progress to next tier (fraction fill, gradient)       |
| Progress caption | "N more sightings to level {name} up" or "Max tier reached" |
| Extra caption    | New discovery only: "N cats tagged this week"               |

### Foil shimmer system

Each catch gets a deterministic but unique foil via `lib/catch-card-seed.ts`:

```ts
getCatchCardFoil(id: string) → { angleDeg: number, offsetPercent: number }
```

- `angleDeg`: 100–130° (subtle diagonal variation, never horizontal/vertical)
- `offsetPercent`: 25–75% (where the bright sweep sits)
- Seeded from a `mulberry32` PRNG, hashed from the UUID string

Rendered as two absolute-positioned overlay divs:

1. **Stripes:** `repeating-linear-gradient({angle}deg, transparent 14px, {color}26 14px–18px, transparent 18px–32px)` — subtle parallel bands tinted to badge color
2. **Sweep:** `linear-gradient({angle}deg, transparent {offset-15}%, rgba(255,255,255,0.12) {offset}%, transparent {offset+15}%)` — a single bright highlight band

### Footer

Left: avatar circle (36px, or orange circle with 🐾 if no avatar) + `@username discovered/spotted this`  
Right: 🐾 + `cat-a-log.app`

---

## Sharing interaction

### Shared utility: `lib/share-image.ts`

```ts
shareCardImage(options: {
  cardUrl: string          // relative API path
  downloadFilename: string // e.g. "mittens-catch-card.png"
  shareTitle: string       // Web Share title
  shareText: string        // Web Share text (URL appended)
  shareUrl: string         // fallback/appended URL
}) → Promise<void>
```

Logic:

1. Fetch the card image from the API route → blob → File
2. If `navigator.canShare({ files })` → use Web Share API with the image file (URL in text body, not as `url` param — avoids silent failures)
3. Fallback: trigger browser download, toast `notify.success('card-downloaded')`

### Profile share button

**File:** `app/(app)/profile/[username]/components/share-profile-button.tsx`

- Dropdown menu with two options: "Copy link" and "Share as image"
- Ghost icon button (`Share2` icon), positioned in the profile header
- Dropdown: `animate-in fade-in zoom-in-95`, rounded-xl, shadow-lg
- Loading state: spinner replaces icon, button disabled

### Catch card share button

**File:** `app/components/catch-card-share-button.tsx`

- Full-width primary button: "Share this catch" with `Share2` icon
- Rounded-xl, `py-6`, `text-base font-semibold` (larger than standard buttons — this is the hero CTA)
- Loading state: "Preparing card…" + spinner

---

## Routing & access

Both card API routes are public (listed in `proxy.ts` `PUBLIC_PREFIXES`) so shared image URLs resolve for recipients who aren't signed in. The pages that _display_ cards (profile page, `/tag/complete`) remain behind auth.

---

## Render behavior

- Cards are rendered on-demand, not persisted to storage
- Cached via HTTP `Cache-Control` for 1 hour (stale-while-revalidate 24h)
- A given catch card always renders identically (deterministic foil seed from immutable UUID)
- Profile cards reflect current data (hero cat may change if featured cat or sighting counts change)

---

## When building new card types

Follow this checklist:

1. Same skeleton: dark surround → gradient border → inner card body
2. Derive all accent colors from a single source (tier, badge, category)
3. Same dimensions (1080×1920), same cache headers
4. Photo in the illustration window at 44% height with vignette
5. Footer: avatar + @username on left, 🐾 cat-a-log.app on right
6. Register the route in `proxy.ts` `PUBLIC_PREFIXES` if the image should be sharable without auth
7. Use `lib/share-image.ts` for the client-side share interaction
8. Loading state on the share button with descriptive text
