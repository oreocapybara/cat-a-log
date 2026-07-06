# Cat-A-Log — Design System

## Identity

Cat-A-Log is a mobile-first PWA for crowdsourced stray cat tracking. The visual identity is warm, friendly, and engagement-app adjacent (Strava/Duolingo feel) — not clinical, not cutesy. The palette is strictly monochromatic orange: hierarchy comes from tint/shade, never a second brand hue.

## Color tokens

All colors are CSS custom properties in `app/globals.css`, consumed via Tailwind's `bg-primary`, `text-muted-foreground`, etc.

### Light mode (`:root`)

| Token                    | Hex         | Role                                         |
| ------------------------ | ----------- | -------------------------------------------- |
| `--background`           | `#FFF7ED`   | Page background (warm cream)                 |
| `--foreground`           | `#2A1B12`   | Body text (warm near-black)                  |
| `--card` / `--popover`   | `#FFFFFF`   | Elevated surfaces                            |
| `--primary`              | `#F97316`   | Buttons, active nav, FAB, links, focus rings |
| `--primary-foreground`   | `#FFFFFF`   | Text/icons on primary                        |
| `--secondary`            | `#FED7AA`   | Chips, badges, subtle fills                  |
| `--secondary-foreground` | `#9A3412`   | Text on secondary surfaces                   |
| `--muted`                | `#F5EBE0`   | Placeholders, disabled fills, empty states   |
| `--muted-foreground`     | `#8A6F5F`   | Helper/meta text                             |
| `--accent`               | `#FED7AA`   | Hover fills                                  |
| `--border` / `--input`   | `#F2DFC8`   | Dividers, input borders                      |
| `--ring`                 | `#F97316`   | Focus rings                                  |
| `--destructive`          | Red (oklch) | Errors, dangerous tags only                  |

### Dark mode (`.dark`)

| Token                    | Hex/Value | Role                                       |
| ------------------------ | --------- | ------------------------------------------ |
| `--background`           | `#1C2534` | Deep blue-gray page background             |
| `--foreground`           | `#EEF1F6` | Body text                                  |
| `--card` / `--popover`   | `#232E42` | Elevated surfaces                          |
| `--primary`              | `#F5B942` | Amber-gold (brighter for contrast on dark) |
| `--primary-foreground`   | `#14181F` | Text on primary                            |
| `--secondary`            | `#34435C` | Chips, badges                              |
| `--secondary-foreground` | `#FCD34D` | Text on secondary                          |
| `--muted`                | `#1F2839` | Subdued fills                              |
| `--muted-foreground`     | `#9AA8BB` | Helper text                                |
| `--border` / `--input`   | `#34435C` | Dividers, input borders                    |
| `--ring`                 | `#F5B942` | Focus rings                                |

Dark mode is managed by `next-themes` (class-based `.dark`, persisted to localStorage, defaults to system preference). A smooth 200ms `transition-property: background-color, border-color, color, fill, stroke` crossfades theme changes (disabled for `prefers-reduced-motion: reduce`).

## Typography

| Role               | Font         | Variable              | Usage                                          |
| ------------------ | ------------ | --------------------- | ---------------------------------------------- |
| Body / UI          | Geist        | `--font-sans`         | All body text, buttons, form labels, nav       |
| Display / headings | Varela Round | `--font-varela-round` | Page titles, cat names, stat numbers, headings |

Applied via `font-sans` (Geist) and `font-heading` (Varela Round) in Tailwind. Varela Round is used sparingly for personality — it's rounded and friendly, matching the app's warm tone. Don't use it for body copy or small text.

## Radius & shadows

- Base `--radius`: `1rem` — everything is generously rounded.
- Derived scale: `--radius-sm` (0.6×) through `--radius-4xl` (2.6×).
- Buttons use `rounded-lg`. The bottom nav and FAB use `rounded-full`.
- Shadows are warm-tinted and soft (not neutral gray). Primary buttons get `shadow-sm shadow-primary/20`. Elevated elements (cards, modals) use `shadow-lg`.

## Surface treatments

### Glass / frosted

The primary overlay aesthetic. Used on the bottom nav, map search pill, filter buttons, and cat preview cards.

```
bg-card/70 dark:bg-card/90
backdrop-blur-md
border border-white/40 dark:border-white/10
shadow-lg
```

### Solid card

Standard card surfaces use `bg-card` with `border-border`. Used for content cards, form containers, auth pages.

## Icons

Lucide React only. No emoji in UI. Icons are 20px (`h-5 w-5`) in navigation, 16px (`h-4 w-4`) inline with text, 24px (`h-6 w-6`) in the FAB and feature-scale contexts.

## Layout

- Mobile-first. Primary design target is 375px width.
- Auth pages: `max-w-sm mx-auto` centered content.
- App shell: full-bleed content with a floating bottom nav (`fixed inset-x-4 bottom-4`).
- Map: truly full-viewport, edge-to-edge.
- Spacing: Tailwind's default scale. Prefer `gap-*` on flex/grid over margin.

## Bottom navigation

A floating glass capsule pinned 16px from screen edges. Three items:

- Map (left) — icon + label
- Tag (center) — elevated FAB, `-top-4` offset, `bg-primary`, 56px diameter, `rounded-full`
- Profile (right) — icon + label

Active state: `text-primary` + filled icon variant. The nav hides entirely during the `/tag` flow for full-screen immersion.

## Components

### Buttons (`components/ui/button.tsx`)

Built on `@base-ui/react/button` with `class-variance-authority`. Variants:

| Variant       | Visual                                                 |
| ------------- | ------------------------------------------------------ |
| `default`     | `bg-primary text-primary-foreground` with warm shadow  |
| `outline`     | `border-border bg-background`, fills on hover          |
| `secondary`   | `bg-secondary text-secondary-foreground`               |
| `ghost`       | Transparent, fills `bg-muted` on hover                 |
| `destructive` | Red tint background, red text (not a solid red button) |
| `link`        | Underline on hover, primary color                      |

Sizes: `xs` (24px), `sm` (28px), `default` (32px), `lg` (36px), plus `icon` variants.

### Forms

- React Hook Form + Zod for validation.
- Error messages: `<p className="text-destructive text-xs">`.
- Inputs use `border-input` and `ring` focus states from the token system.

### Toasts (Sonner)

- Position: `top-center` (current; migrating to `bottom-center` with 80px offset to clear the nav).
- Voice: warm, specific, actionable. No jargon, no apologies. Always a forward path.
- Success: brief and quiet (2s). Errors: 4s with recovery guidance. Undo: 7s.
- No emoji in toast messages. Consistent sentence-case copy.

### Cards (`components/ui/card.tsx`)

Standard shadcn card primitives. Support `data-size="sm"` for compact padding. Used throughout for cat profiles, list items, preview panels.

## Motion

All motion is CSS-only (keyframes in `globals.css` + `tw-animate-css`). No animation library.

| Element              | Animation                                                | Duration    |
| -------------------- | -------------------------------------------------------- | ----------- |
| Map markers          | `bounce-in` (scale 0 → 1.15 → 1)                         | 400ms       |
| Selected marker      | `bounce-in-lift` (same + translateY lift)                | 400ms       |
| Marker entrance      | Staggered `animation-delay: min(i*40ms, 400ms)`          | —           |
| User location dot    | `pulse-ring` (expanding fading box-shadow)               | 2s infinite |
| Map tiles            | Fade in on load (`opacity 0→1`)                          | 200ms       |
| FAB first-time pulse | Expanding ring, plays 3×, then never again               | 1.3s × 3    |
| Gallery open/close   | Origin-expansion (`gallery-expand` / `gallery-contract`) | 300-350ms   |
| Theme switch         | 200ms crossfade on color properties                      | 200ms       |
| Tag flow transitions | `animate-in fade-in slide-in-from-right-4`               | 200ms       |
| Buttons/inputs       | `transition-all` or `transition-colors`                  | 150ms       |
| Active press         | `active:scale-95` or `active:translate-y-px`             | Instant     |

### Reduced motion

All animations respect `prefers-reduced-motion: reduce`. Markers appear in final state, pulses become static rings, gallery snaps open, tiles appear immediately. This is enforced globally in `globals.css` via a `@media (prefers-reduced-motion: reduce)` block.

## Writing voice (UI copy)

- Warm and specific. Not corporate, not twee.
- Active voice. System owns its failures ("Couldn't upload" not "Upload failed").
- Sentence case everywhere (buttons, labels, toasts, headings).
- No trailing periods on single-sentence UI text.
- Errors always include a next step ("Try again in a moment", "Pull down to refresh").
- Success messages are brief confirmations, not celebrations.
- No emoji in UI copy.

## Patterns to follow

- Use `cn()` from `@/lib/utils` for conditional class merging (clsx + tailwind-merge).
- Colocate components at the narrowest scope that's true (page → route group → `components/ui/`).
- Always use the semantic color tokens (`bg-primary`, `text-muted-foreground`, etc.) — never hardcode hex values in components.
- Prefer Tailwind utilities over custom CSS. Reserve `globals.css` for keyframes and global base rules.
- Use `motion-safe:` or the global reduced-motion media query for any new animation.
- Mobile touch targets: minimum 44×44px for interactive elements.
- Focus rings: handled by the button/input primitives via `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`.

## Anti-patterns

- No hardcoded colors — use tokens.
- No emoji in UI — use Lucide icons.
- No animation libraries (Framer Motion, etc.) — CSS keyframes only.
- No neutral gray shadows — warm-tint them or use the existing shadow utilities.
- No second brand color — orange monochromatic only, hierarchy through lightness.
- No importing `toast` from `sonner` directly — use the `notify` module from `@/lib/toast`.
- No `middleware.ts` — Next.js 16 uses `proxy.ts`.
