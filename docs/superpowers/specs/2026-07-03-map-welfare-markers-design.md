# Welfare Tag Emphasis on Map Markers — Design

## Goal

Make a cat's welfare status (`needs_medical`, `possible_rabies`, `deceased`) visually distinguishable directly on the map marker, not just after tapping into the preview card. Extend the same color language to the preview card's tag pills so severity reads consistently in both places.

## Priority when a cat has multiple tags

Only one visual treatment fits a marker, so tags are ranked by actionability: **`needs_medical` > `possible_rabies` > `deceased` > none.** A cat tagged both `needs_medical` and `deceased` shows the medical treatment — the tag someone can actually act on wins.

## Marker treatment (applies to both the 44px inactive circle and the 64px active square)

| Tag               | Border color                                                                                                   | Badge                                       | Photo                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| `needs_medical`   | `#dc2626` (red — same hue as the app's `destructive` token)                                                    | small circular badge, red fill, white `+`   | unchanged                                                              |
| `possible_rabies` | `#b45309` (amber-700 — darker than a lighter amber so the white `!` glyph clears contrast guidelines at ~11px) | small circular badge, amber fill, white `!` | unchanged                                                              |
| `deceased`        | muted gray (`#9ca3af`)                                                                                         | none                                        | `grayscale(1)` + reduced opacity — informational, not a call to action |
| none              | current brand orange (`#f97316`)                                                                               | none                                        | unchanged                                                              |

Badge is an 18px circle (scaled proportionally on the 64px active marker), positioned top-right, overlapping the marker's edge (absolute-positioned, matches how the active marker's label already sits outside its own box without clipping).

## Data flow

- `app/(app)/map/page.tsx` already builds `catTags: Map<catId, CatTag['tag'][]>` for the preview card and filter sheet — it is not currently passed to `CatMap`. Add a `catTags` prop to `CatMap`.
- `cat-map.tsx`: new helper `getWelfareStyle(tags: CatTag['tag'][])` returning `{ borderColor, badge: { color, glyph } | null, desaturate: boolean }`, applying the priority order above. `makeCatIcon` (both the inactive and active branches) calls this once and uses the result instead of the hardcoded `#f97316` border — single source of truth, no duplicated priority logic.
- `catIcons` `useMemo` (already keyed on `[cats, selectedCatId]`) looks up `catTags.get(cat.id) ?? []` per cat and passes it into `makeCatIcon`; add `catTags` to the memo's dependency array.

## Preview card

`cat-preview-card.tsx` already renders tag pills (currently all `bg-secondary`, neutral). Recolor using the same mapping:

- `needs_medical` → soft red, reusing the existing `destructive` token (`bg-destructive/10 text-destructive`, matching the soft-fill convention already used by the destructive button variant)
- `possible_rabies` → soft amber (`bg-amber-100 text-amber-800`, with an explicit `dark:` variant since there's no existing amber design token)
- `deceased` → unchanged neutral gray
- "Ear-tipped" pill is unrelated to welfare status and stays as-is

## Explicitly out of scope

- Filter sheet — no visual changes, it already lists these tags as checkboxes.
- Any change to which tags exist or how they're assigned (`cat_tags` table, tagging UI) — this is a display-only change.
- Animation/pulsing on the badge — not requested; can be a fast follow if wanted later.

## Testing / verification

No new business logic branches beyond the priority-ordering helper, which is pure and easily eyeballed. Verification: run the dev server, render markers for cats carrying each tag (and a multi-tag cat, to confirm priority order) in both light and dark mode, confirm the preview card pill colors match, and confirm `npm run type-check` / `lint` / `build` stay green.
