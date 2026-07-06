# Shareable Cards — Tier Variants Implementation Spec

Companion to `CARD_REDESIGN_GUIDE.md` (base card anatomy, fonts, neutrals). This doc covers the **tier variant system** and the **new-catch vs existing-catch states**. Reference build: `Shareable Cards Redesign.dc.html`, turn 4 (groups 4a / 4b / 4c).

Production card size: **1080×1920** (9:16). Mockups are 480×853 — multiply all px values below by **2.25** for production.

---

## 1. Tier data model

```ts
type TierKey = 'stray' | 'lurker' | 'regular' | 'localCelebrity' | 'streetRoyalty' | 'urbanLegend'

interface Tier {
  key: TierKey
  label: string // display name, e.g. "Local Celebrity"
  accent: string // border / dots / progress / avatar
  chipBg: string // tier-name chip background
  dotsFilled: 1 | 2 | 3 | 4 | 5 | 6
  next: TierKey | null // null = max tier
}
```

| key            | label           | accent    | chipBg    | dots | next           |
| -------------- | --------------- | --------- | --------- | ---- | -------------- |
| stray          | Stray           | `#8b93a0` | `#e4e7eb` | 1    | lurker         |
| lurker         | Lurker          | `#8b8378` | `#e5e1db` | 2    | regular        |
| regular        | Regular         | `#cf9f1f` | `#fdf1d6` | 3    | localCelebrity |
| localCelebrity | Local Celebrity | `#f97316` | `#fde3d0` | 4    | streetRoyalty  |
| streetRoyalty  | Street Royalty  | `#ef4444` | `#fbdad9` | 5    | urbanLegend    |
| urbanLegend    | Urban Legend    | `#fbbf24` | `#fdf1d6` | 6    | —              |

**Rank-name color** (used in TIER RANK stat tile): `#6b6259` for stray/lurker (accent too low-contrast on cream), `#d97706` for urbanLegend (darker gold for legibility), otherwise the tier accent.

---

## 2. Per-tier motifs

Applied identically to Catch and Profile cards. All decorations are absolutely-positioned children of the photo block (`position:relative`) — the photo itself is **never rotated**. Values below are mockup-scale px.

### stray — "paper tag"

- Inner-card border: `7px dashed accent` (all other tiers solid/double).
- Tier chip: `border-radius:10px` (squared tag) instead of the pill 999px.
- Photo outline at 53% opacity (`accent + '88'`).
- No decoration.

### lurker — "half-seen"

- Inner-card border: `7px double accent`.
- Photo vignette overlay INSIDE the photo frame (`inset:9px; border-radius:16px`):
  `linear-gradient(to top, #3a352fcc 0%, transparent 38%)` — the cat "peeks out of shadow".

### regular — "sticker"

- ★ sticker badge on photo top-right corner: 52px circle, accent bg, `4px solid #fff` border, white ★ glyph 24px Fredoka, `top:-12px; right:-4px`, drop shadow `0 6px 14px rgba(0,0,0,.18)`.

### localCelebrity — "paparazzi"

- Chip gets a leading ★ glyph in accent.
- Two starbursts on the photo: ★ 36px at `top:-12px; left:-6px`, ★ 26px at `bottom:-6px; right:-6px`, color accent, `text-shadow:0 3px 0 #fff` (sticker offset).

### streetRoyalty — "regal"

- Inner-card border: solid accent **plus** inner ring: `box-shadow: inset 0 0 0 4px #fffdf9, inset 0 0 0 6px accent@33%`.
- Chip: `2px solid accent@33%` outline + leading ♛ glyph in accent.
- ♛ crown 46px Fredoka centered above the photo (`top:-30px; left:50%; translateX(-50%)`, `text-shadow:0 3px 0 #fff`). Photo block needs extra top margin (~30px) for crown clearance.

### urbanLegend — "mythic"

- Inner-card border: gold gradient via double-background trick:
  `border:7px solid transparent; background: linear-gradient(#fffdf9,#fffdf9) padding-box, linear-gradient(135deg,#fbbf24,#fde68a,#d97706,#fbbf24) border-box`.
- Outer frame glow: add `0 0 46px #fbbf2455` to the standard drop shadow.
- Filled rarity dots get `box-shadow:0 0 6px #fbbf24aa`.
- Photo outline `#d97706` + `0 0 22px #fbbf2477` glow.
- Chip bg: `linear-gradient(135deg,#fdf1d6,#fde68a)` + leading ✦ glyph in `#d97706`.
- Three ✦ sparkles around photo: 30px `top:-14px;left:-8px` (#d97706), 22px `top:26px;right:-8px`, 22px `bottom:-8px;left:30px` (#fbbf24), all `text-shadow:0 2px 0 #fff`.
- Progress caption when maxed: "Max tier reached".

Glyphs ★ ♛ ✦ are text glyphs (Fredoka), **not** emoji — the no-decorative-emoji rule from the base guide still holds.

---

## 3. Catch Card states: `isNewCatch`

One boolean drives every difference. Everything else (tier motif, layout) is unchanged.

| Element        | Existing catch (`false`)                                                                                                                                                                                 | New catch (`true`)                                                                                                                                                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Photo badge    | Stamp: "SIGHTING № {n}" — `3px solid accent@66%` border, accent text, `#fffdf9dd` bg, radius 8, `rotate(6deg)`, bottom-right of photo (`bottom:14px; right:6px`), 14px Fredoka 800, letter-spacing .08em | Burst: "NEW CATCH" — accent bg, white text 17px Fredoka 700, padding 10×18, radius 14, `4px solid #fff`, `rotate(-8deg)`, top-left overlapping photo (`top:-14px; left:-8px`), shadow `0 8px 18px rgba(0,0,0,.2)`, z-index above stamp/motifs |
| Subline        | `"{n}th confirmed sighting"`, neutral `#6b6259`                                                                                                                                                          | `"First-ever sighting — added to the log"`, colored with the tier rank-name color                                                                                                                                                             |
| Confetti       | none                                                                                                                                                                                                     | 5 small CSS shapes (8–14px circles/squares, mixed tier accents `#f97316 #ef4444 #cf9f1f`, opacity .7, slight rotations) absolutely scattered in the header zone (top 46–70px). Decorative only — `pointer-events:none`, `aria-hidden`         |
| SIGHTINGS stat | n (>1)                                                                                                                                                                                                   | 1                                                                                                                                                                                                                                             |
| Progress bar   | current progress within tier                                                                                                                                                                             | near-empty (~18%) — freshly started                                                                                                                                                                                                           |

Ordinal helper needed for the subline (`1st/2nd/3rd/nth`).

## 4. Profile Card

No new/existing concept. Takes the **hero cat's tier** and applies the same motif recipe. Differences from Catch (see base guide): subline `"@{user}'s top catch"`, stats DISCOVERED / SIGHTINGS / TIER, collection strip instead of progress bar, footer handle without "spotted this".

---

## 5. Suggested component structure

```
<ShareCard type="catch" tier={tier} isNewCatch={bool} cat={...} user={...} />
<ShareCard type="profile" tier={tier} cat={...} user={...} collection={[...]} />
```

- `TIERS: Record<TierKey, Tier>` constant — single source of truth for §1 table.
- Motifs as a lookup, not conditionals scattered in JSX: `tierFrameStyle(tier)`, `tierChip(tier)`, `tierPhotoDecorations(tier)`, `photoOutline(tier)`.
- Overflow: the inner card must be `overflow:visible` (badges/crown/sparkles intentionally cross the photo frame edge) but all decoration offsets are tuned to stay **inside the inner card border** — don't let anything cross the outer cream frame.
- Fixed-height card: photo block is the flex-fixed element (`flex:0 0 330px` catch / `240px` profile at mockup scale); footer uses `margin-top:auto`. If content is added, shrink the photo, never the footer.
- Medical alert (see base guide) replaces the tier chip top-left; it is tier-independent and coexists with all motifs. On a new catch, the "NEW CATCH" burst stays on the photo — the chip slot goes to the medical tag.

## 6. QA checklist

- [ ] All 6 tiers render both card types without content clipping at 1080×1920.
- [ ] Urban Legend gradient border renders (check `background-clip` support / fallback to solid `#fbbf24`).
- [ ] New-catch: burst badge, confetti, accent subline, SIGHTINGS=1, low progress.
- [ ] Existing: stamp shows correct ordinal; no confetti.
- [ ] No emoji other than 🐾 brand mark and ✚ medical glyph.
- [ ] Photo never rotated; decorations never cross the outer cream frame.
- [ ] Rank-name colors pass contrast on `#fbf1e2` tiles (stray/lurker use `#6b6259`, urbanLegend `#d97706`).
