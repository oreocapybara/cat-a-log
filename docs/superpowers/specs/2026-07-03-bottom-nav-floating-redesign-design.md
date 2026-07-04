# Bottom Nav — Floating Capsule Redesign

## Goal

Restyle `app/(app)/components/bottom-nav.tsx` from a plain edge-to-edge bordered
bar into a floating glass capsule, matching the visual language already
established on the map screen (search bar, locate button, filter trigger):
`bg-card/70 dark:bg-card/50`, `backdrop-blur-md`, `border-white/40
dark:border-white/10`, `shadow-lg`.

This component predates that later map redesign, so it's currently the one
piece of persistent shell chrome that doesn't match the rest of the app's
established look.

## Design

- The bar pulls in from all edges instead of sitting flush against the bottom
  of the viewport: `fixed inset-x-4 bottom-4`, fully rounded (`rounded-full`),
  `shadow-lg`.
- Background/border/blur match the glass treatment above exactly — no new
  tokens, reusing what's already established.
- The center Tag button keeps its current elevated-FAB treatment (primary-orange
  fill, `-top-4` offset, own shadow) — it continues floating above the capsule
  rather than being redesigned. It's the nav's one signature element; nothing
  new competes with it.
- Selected-tab styling is unchanged (icon/label recolor to `text-primary`,
  filled icon). No active-indicator pill behind the selected tab — that would
  add a second decorative flourish alongside the FAB, which the restraint
  pass in this design explicitly rules out.

## Ripple effects (layout coupling)

The nav's rendered height and bottom offset are hard-coded in two other
places, both sized to match the _old_ edge-to-edge bar:

- `app/(app)/layout.tsx` — `pb-20` on `<main>`, reserving space for the nav.
- `app/(app)/map/page.tsx` — three root divs use `-mb-20` to counteract that
  same padding so the map renders truly full-viewport (this offset exists
  because `/map` is the one page that needs edge-to-edge content instead of
  the shared layout's default scroll body).

Both numbers must change together to match the new capsule's actual rendered
height + bottom margin — measured in a real browser after building, not
guessed, the same way this pairing was originally derived (see the earlier
`-mb-20` fix, which was root-caused via exact `scrollHeight` measurement).

## Explicitly out of scope

- No active-tab highlight pill (see Design section above).
- No changes to nav item structure, routes, or the FAB's own visual treatment
  beyond what's needed for it to sit correctly above the new capsule shape.
- No changes to the pre-existing dead `pb-safe` class already on the inner
  flex row (unused today, unrelated to this restyle — not worth touching in
  this pass).

## Testing / verification

No test framework in this repo. Manual/browser verification: confirm the
capsule renders with correct margins/rounding/blur in both light and dark
mode, confirm the FAB still sits correctly elevated above it, confirm no
content is clipped behind the nav on `/map` and `/profile/me` (the two real
pages using the shared layout), and confirm the measured `pb-*`/`-mb-*` pair
leaves no scrollable gap (same check as the original bug fix).
