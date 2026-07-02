# App-Wide Visual Redesign — Design

## Goal

Reskin the whole app from the current grayscale shadcn default theme to a warm, ginger-cat-orange palette with a "modern, clean, engagement/tracking app" feel (Strava/Duolingo/Fitbit-adjacent), in both light and dark mode. Also design the visual shell for the two still-placeholder pages (`/map`, `/profile/me`) for the first time. This is a styling and shell pass — no new data logic, no live map integration, no new profile queries.

## Design tokens

### Color

Adapted from a "Pet Tech App" palette (primary `#F97316` already matches the existing `themeColor` in `app/layout.tsx`). Monochromatic — orange is the only brand hue; hierarchy comes from tint/shade, not a second color. `destructive` stays the existing semantic red, unchanged (errors, `possible_rabies` tag) — semantic colors are not swept into the rebrand.

**Light** (`:root` in `app/globals.css`)

| Token                  | Value                    | Use                                         |
| ---------------------- | ------------------------ | ------------------------------------------- |
| `background`           | `#FFF7ED`                | page background (warm cream)                |
| `foreground`           | `#2A1B12`                | body text (warm near-black)                 |
| `card` / `popover`     | `#FFFFFF`                | elevated surfaces                           |
| `primary`              | `#F97316`                | buttons, active nav, FAB, links             |
| `primary-foreground`   | `#FFFFFF`                | text/icons on primary                       |
| `secondary`            | `#FED7AA`                | chips, badges, subtle fills                 |
| `secondary-foreground` | `#9A3412`                | text on secondary, deep-terracotta headings |
| `muted`                | `#F5EBE0`                | placeholders, disabled fills                |
| `muted-foreground`     | `#8A6F5F`                | helper/meta text                            |
| `accent`               | `#FED7AA`                | hover fills                                 |
| `border` / `input`     | `#F2DFC8`                | dividers, input borders                     |
| `ring`                 | `#F97316`                | focus rings                                 |
| `destructive`          | unchanged (existing red) | errors                                      |

**Dark** (`.dark`) — a warm dark brown, not inverted gray, so the brand still reads:

| Token                  | Value                                        |
| ---------------------- | -------------------------------------------- |
| `background`           | `#1C1410`                                    |
| `foreground`           | `#FDF3E7`                                    |
| `card` / `popover`     | `#241B15`                                    |
| `primary`              | `#FB923C` (brighter for contrast on dark bg) |
| `primary-foreground`   | `#1C1410`                                    |
| `secondary`            | `#3A2A1E`                                    |
| `secondary-foreground` | `#FDBA74`                                    |
| `muted`                | `#2E241C`                                    |
| `muted-foreground`     | `#C4A98C`                                    |
| `border` / `input`     | `#3A2A1E`                                    |
| `ring`                 | `#FB923C`                                    |
| `destructive`          | unchanged (existing dark-mode red)           |

### Typography

- Body: Geist (unchanged, already wired via `next/font/google` in `app/layout.tsx`).
- Headings, page titles, cat names, stat numbers: **Varela Round** (new `next/font/google` import) — chosen from the design-system database specifically because it's tagged for pet apps and warm/friendly UI.
- Wire as `--font-heading` (already a token slot in `globals.css` `@theme inline`, currently aliased to `--font-sans` — repoint it to the new Varela Round variable).

### Radius & shadows

- Base `--radius`: `0.625rem` → `1rem` (softer, rounder corners to match Varela Round's roundness — all the `--radius-sm` … `--radius-4xl` scale in `globals.css` derives from this one variable, so it's a one-line change).
- Cards/buttons get a soft warm-toned shadow (e.g. `shadow-orange-950/5` style, tuned per-component) instead of the current flat neutral shadcn shadow.

### Icons

Lucide only (already a dependency). Remove every emoji placeholder: 🐱 (login/register logo), 🗺️ (`/map`), 🐾 (`/profile/me`).

## Page-by-page treatment

- **Shared primitives** (`components/ui/button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`, `checkbox.tsx`, `textarea.tsx`, `sonner.tsx`): no logic changes — they already reference `bg-primary`/`text-primary`/etc. rather than hardcoded colors, so they inherit the new tokens automatically once `globals.css` changes.
- **Bottom nav** (`app/(app)/components/bottom-nav.tsx`): same — inherits new tokens, FAB gets the new warm shadow treatment.
- **Auth pages** (`(auth)/login`, `(auth)/register`, `(auth)/setup-profile`): replace 🐱 emoji with a Lucide `Cat` icon in a rounded `primary`-colored badge; `Card` picks up new warm surface color; "Welcome back" / "Cat-A-Log" headings switch to Varela Round.
- **Tag flow** (`(app)/tag/components/*`): apply new tokens throughout; add a small step-progress indicator (dots, `primary`-colored for completed/current steps) across the 5 screens (photo → candidates → name/details or match-found), since the flow has no sense of progress today.
- **`/map`** (net-new visual shell, no live map library wired up — that's separate follow-up work): full-bleed placeholder map area (flat warm-tan surface standing in for real map tiles), a floating search/filter pill docked near the top, and a bottom-sheet-style card for a "selected cat" preview (static mock content, no data query yet). The existing bottom-nav FAB remains the only "add a cat" entry point — no duplicate button on this page.
- **`/profile/me`** (net-new visual shell, minimal scope): centered avatar circle (initials fallback rendered in `primary` orange when no `avatar_url`), username in Varela Round, bio text, a light/dark mode toggle (see below), and the existing sign-out button restyled. No stats, no tagged-cats grid — those stay deferred to the page's planned future build.

## Dark mode toggle

- New dependency: `next-themes` — handles class-based (`.dark`) theme switching with localStorage persistence and no flash-of-wrong-theme on load, which would otherwise require a hand-rolled inline `<head>` script. Small (~1kb), single-purpose, standard for this exact problem in Next.js.
- Wire `ThemeProvider` in `app/layout.tsx` around existing children, `attribute="class"`, `defaultTheme="system"`, `enableSystem`.
- Toggle UI: a `Sun`/`Moon` Lucide icon switch on `/profile/me`. Defaults to OS preference on first visit; an explicit toggle overrides and persists via `next-themes`' own localStorage handling.

## Animation

- **Micro-interactions** (buttons, inputs, nav): already handled by existing shadcn primitives (`transition-colors`/`transition-all`, 150–200ms) — inherit new colors, no changes needed.
- **Tag flow screen transitions**: the 5-screen switch in `tag/page.tsx` currently swaps components instantly. Add `animate-in fade-in slide-in-from-right-4 duration-200` (via the already-installed `tw-animate-css` — no new dependency) on each screen's root.
- **Step-progress dots**: active dot transitions color/scale over 150ms on step change.
- **Candidates screen cards**: plain fade-in on load — no staggered entrance (unneeded complexity for a handful of cards).
- **Dark mode toggle**: the color swap itself is instant, not animated — cross-fading a whole page's color scheme tends to read as lag rather than smoothness; deliberate non-animation.
- **Reduced motion**: wrap the new transition/`animate-in` classes in Tailwind's `motion-safe:` variant (native CSS media-query-backed, no JS) so `prefers-reduced-motion` users get instant state changes instead.
- **Loading states**: already present (`Loader2` spinners on photo upload, disabled-button text swaps on auth forms) — recolor only, no new loading UI.

## New dependencies

- `next-themes` — dark mode toggle (justification above).
- `Varela Round` via `next/font/google` — no new npm package, same mechanism already used for Geist.

## Error handling

Not applicable — no new data-fetching or mutation paths are introduced by this spec. Existing error handling (toasts on Supabase failures, session-expiry redirects) is untouched.

## Explicitly out of scope

- Live map library integration on `/map` (Leaflet/MapLibre/etc. wiring) — only the static visual shell.
- `/profile/me` stats (`tags_count`) or a tagged-cats grid — deferred to that page's planned future build.
- Any new automated visual regression tests.
- Changing the CTA/action color to a second (non-orange) brand hue — rejected in favor of a strictly monochromatic palette per explicit direction.

## Testing / verification

No test framework exists in this repo (no `npm test` script) and this is a styling-only change (no new business logic). Verification:

1. `npm run type-check`, `npm run lint`, `npm run build` — existing CI gates.
2. Manual walkthrough at 375px width, in both light and dark mode (toggle via the new `/profile/me` switch, and via OS preference on first load): login → register → setup-profile → map → tag (all 5 steps) → profile. Check contrast, touch target sizes, no emoji remnants, no horizontal scroll, focus rings visible, screen transitions in the tag flow feel smooth (not jarring, not sluggish), and with OS-level "reduce motion" enabled, transitions become instant.
