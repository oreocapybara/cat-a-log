# Cat Staleness + Directions — Design

## Goal

Make it immediately clear to users that a cat pin marks where the cat _was last seen_, not where it currently is, and give them a one-tap way to get directions to that spot. Two mechanisms work together: a timestamp-driven visual staleness system on pins, and a "Get directions" button in the preview card.

---

## Staleness tiers

Staleness is derived from `cats.created_at` (the initial tagging timestamp — the most recent real-world observation point we have). Three tiers:

| Tier  | Age        | Pin opacity | Pin size      |
| ----- | ---------- | ----------- | ------------- |
| Fresh | < 24 hours | 100%        | normal (32px) |
| Aged  | 1–7 days   | 70%         | normal (32px) |
| Stale | > 7 days   | 40%         | normal (32px) |

Size stays constant — only opacity changes. Shrinking pins on a crowded map creates a usability problem (harder to tap) without adding much signal. Opacity is the passive signal; the timestamp in the preview card is the precise signal.

A utility function `getStalenessOpacity(createdAt: string): number` in `lib/geo.ts` (alongside the existing `distanceKm`) handles the tier logic and returns `1`, `0.7`, or `0.4`. This keeps the logic testable and out of the rendering layer.

---

## "Get directions" button in the preview card

The button opens the device's default navigation app via a deep-link URL. On mobile (iOS and Android) `maps:?daddr=` and `geo:` links are unreliable across all browsers — `https://maps.google.com/maps?daddr=` is the safe cross-platform choice: it deep-links to Google Maps on devices where it is installed, and falls back to the browser on devices where it isn't.

```
https://maps.google.com/maps?daddr=${lat},${lng}
```

The link opens in a new tab (`target="_blank"`, `rel="noopener noreferrer"`).

Button label: **"Get directions"**. No clever copy like "Navigate to last sighting" — that's verbose for a button. The timestamp line already sets the context.

### Timestamp line

The existing distance line in `CatPreviewCard` reads:

```
📍 42m away  ·  👁 Spotted 3 times
```

Add the last-seen age immediately after distance, before the eye count:

```
📍 42m away  ·  🕐 Seen 3 days ago  ·  👁 Spotted 3 times
```

Use a `Clock` icon (Lucide) to match the existing icon-before-label pattern. Format:

- < 1 hour → `Seen just now`
- 1–23 hours → `Seen Xh ago`
- 1–6 days → `Seen X days ago`
- ≥ 7 days → `Seen X weeks ago` (or `Seen over a month ago` if > 4 weeks)

A utility `formatLastSeen(createdAt: string): string` in `lib/geo.ts` handles this formatting.

### Layout change to the preview card

The card currently has a single content column with no bottom action row. Add a bottom row below the name/distance/tags block:

```
[ cat photo ]  [ name                              ] [ × ]
               [ distance · seen X ago · eye count ]
               [ tags...                            ]
               ─────────────────────────────────────
               [ Get directions          →          ]
```

The "Get directions" row is a full-width `<a>` styled as a ghost button with a `Navigation` icon (Lucide), `text-muted-foreground`, separated from the tags block by a thin `border-t border-border/60`. It sits inside the card's existing horizontal flex layout in a second row — wrap the current right column content in a `flex flex-col gap-1` and append the directions row at the bottom.

---

## Components changed

### `lib/geo.ts`

Add two exports:

- `getStalenessOpacity(createdAt: string): number` — returns `1 | 0.7 | 0.4`
- `formatLastSeen(createdAt: string): string` — returns human-readable age string

No other files in `lib/` change.

### `app/(app)/map/components/cat-map.tsx`

The cat pins are rendered as Leaflet `DivIcon` markers. The current rendering passes a static CSS class for the pin color (welfare tier). Add `opacity: getStalenessOpacity(cat.created_at)` to each marker's `style` or pass it as an inline CSS opacity on the icon element.

Look at how icons are currently created in `cat-map.tsx` and apply the opacity to the outermost element of the `DivIcon` HTML string. Do not restructure the icon creation logic — minimal change only.

### `app/(app)/map/components/cat-preview-card.tsx`

1. Import `Clock`, `Navigation` from `lucide-react`.
2. Import `formatLastSeen` from `@/lib/geo`.
3. Add `formatLastSeen(renderedCat.created_at)` to the distance/eye-count line using `Clock` icon, same icon-before-label pattern already used for `MapPin` and `Eye`.
4. Add the directions `<a>` row below the tags block, inside the right column, separated by `border-t border-border/60 pt-1.5 mt-1.5`.

No new components. No new files. No changes to `page.tsx`.

---

## What this feature does NOT do

- No live tracking of the cat's position — this is explicitly not a tracker.
- No "uncertainty radius" circle on the map pin — adds visual noise for limited gain; the opacity already signals staleness passively.
- No disclaimer screen or modal before opening directions — one extra tap with no new information.
- No distinction between `created_at` (initial tagging) and the most recent sighting date — `sightings` data is not currently loaded on the map page. If a future spec adds sightings to the map data, the staleness calculation should switch to `MAX(sightings.created_at)`, but that is out of scope here.
- No changes to the map data-fetching logic or Supabase queries.

---

## Verification

No test framework in this repo. Manual verification:

1. Tap a cat pinned today — preview card shows "Seen just now", pin at full opacity, directions link opens Google Maps to the pin's coordinates.
2. Tap a cat pinned 3 days ago — preview card shows "Seen 3 days ago", pin visually dimmer than a fresh pin.
3. Tap a cat pinned 10 days ago — preview card shows "Seen 1 week ago", pin at lowest opacity.
4. Confirm "Get directions" opens in a new tab (`target="_blank"`), not in the same tab.
5. Confirm the close button (`×`) still dismisses the card and that the directions row doesn't overflow on a narrow phone screen (test at 375px width).
