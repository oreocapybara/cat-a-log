# Shareable Cards — Redesign Guide

Replaces the dark "holographic game card" system with a **playful, cream-toned mascot-card** look. Same 1080×1920 (9:16) card, same two types (Catch Card, Profile Card), new visual language. Reference build: `Shareable Cards Redesign.dc.html`, option 3a (Catch Card) / 3b (Profile Card).

## Fonts

- Headlines / numbers / labels: **Fredoka** (600–800)
- Body / small text: **Nunito** (400–800)
  Load both from Google Fonts.

## Structure (both card types)

```
Outer frame   — cream bg #fdf4e7, radius 48px, padding ~26px 20px, soft drop shadow
  Inner card  — white bg #fffdf9, radius 36px, 7px solid border in tier accent color
    Header row (space-between)
    Photo block — rounded 24px, 9px white border + 3px tier-color outline, no rotation, object-fit:cover, object-position:center
    Name + subline
    3-stat row — pill chips, bg #fbf1e2, radius 16px
    Progress bar + caption (Catch) OR Collection strip (Profile)
    Footer — dashed top border, avatar + handle left, "🐾 cat-a-log.app" right
```

## Colors — derive everything from the tier color

Base neutrals: cream `#fdf4e7` (outer), white `#fffdf9` (inner), warm brown text `#2a2117` (names), `#6b6259`/`#a17a4a` (secondary text).

For each tier, generate a **light chip tint**, a **mid accent** (used for border/dots/progress), from the tier's base hex:
| Tier | Base | Accent (border/dots/progress) | Chip tint bg |
|---|---|---|---|
| Stray | `#64748b` | `#8b93a0` | `#e4e7eb` |
| Lurker | `#78716c` | `#8b8378` | `#e5e1db` |
| Regular | `#eab308` | tone down ~20% sat | `#fdf1d6` |
| Local Celebrity | `#f97316` | as-is | `#fde3d0` |
| Street Royalty | `#ef4444` | as-is | `#fbdad9` |
| Urban Legend | `#fbbf24` | as-is + glow shadow | `#fdf1d6` |
Medical-alert tag is always coral/red (`#ef5b4e` / text `#c8402f` / tint `#fdf1ef`) regardless of tier — it's a status flag, not tier-driven.

## Catch Card specifics

- **Header**: if the cat needs medical attention, the tag `✚ Needs Medical` (coral pill) replaces the tier-name chip in the top-left; otherwise show the tier name chip. Rarity dots always top-right (6 dots, filled to tier level).
- **Subline**: "Nth confirmed sighting" — no location text.
- **Stats row**: SIGHTINGS / DISCOVERED / TIER RANK (tier rank shows the **tier name**, e.g. "Lurker" — never a number).
- **Progress bar**: thick rounded bar (16px), caption "N more sightings to level up to {next tier}" — no emoji.
- **Footer**: avatar initial circle + "@username spotted this" · "🐾 cat-a-log.app".

## Profile Card specifics

- **Header**: tier-name chip (hero cat's tier) + rarity dots, always (no medical concept here).
- **Subline**: "@username's top catch".
- **Stats row**: DISCOVERED / SIGHTINGS / TIER (tier shows tier name).
- **Collection strip**: label "COLLECTION" + row of up to 4 square thumbnails (56×56, radius 12) + a "+N" overflow tile in the neutral chip tint.
- **Footer**: avatar + "@username" (no "spotted this") · "🐾 cat-a-log.app".

## Rules carried over from the original system

- No location/place names in card copy.
- No decorative/filler emoji (no 🎉 etc.) — the only emoji is the "🐾 cat-a-log.app" brand mark and the "✚" medical glyph.
- Photo is never rotated/tilted.
- Card is always 1080×1920 in production; the DC mockups here are scaled to 480×853 for review.
