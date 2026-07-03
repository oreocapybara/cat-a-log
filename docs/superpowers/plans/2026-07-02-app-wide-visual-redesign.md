# App-Wide Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin Cat-A-Log from the current grayscale shadcn theme to a warm ginger-orange, "engagement app" look — in both light and dark mode, toggleable from `/profile/me` — and build the first visual shells for `/map` and `/profile/me`.

**Architecture:** Pure design-token + component-styling pass. Color, radius, and font live entirely in `app/globals.css` and `app/layout.tsx`, cascading automatically into every page and shared primitive (`components/ui/*`) that already references semantic classes (`bg-primary`, `text-muted-foreground`, etc.) rather than hardcoded colors. Dark mode is `next-themes`-driven (class-based, matching the `.dark` selector already scaffolded in `globals.css`). `/map` and `/profile/me` get net-new page content; everything else is a recolor + small additions (icon swaps, a step-progress indicator, screen-transition animations).

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, shadcn/ui + Base UI, `tw-animate-css` (already installed), `next-themes` (new), Lucide React, `next/font/google`.

## Global Constraints

- TypeScript strict mode — every touched file must pass `npm run type-check` with zero errors.
- No test framework exists in this repo (no `npm test` script) — verification is `type-check`/`lint`/`build`/`format:check` plus manual browser walkthrough, matching this repo's existing convention (see the tag-catch-flow plan).
- Component placement: colocate at the narrowest scope that's true (`AGENTS.md` "UI conventions") — new page-only components live in that page's own `components/` folder.
- Commits follow Conventional Commits (`AGENTS.md`) — one commit per task, scopes `shell`, `auth`, `tag`, `map`, `profile` as appropriate.
- Supabase clients: Server Components use `lib/supabase/server.ts` (async); Client Components use `lib/supabase/client.ts`. Never construct a client inline.
- Lucide icons only — no emoji used as UI icons anywhere touched by this plan.
- Strictly monochromatic orange brand palette — `destructive` (red) is the only non-orange semantic exception, and it is not touched by this plan.
- Styling/shell-only pass: no live map library integration on `/map`, no `/profile/me` stats or tagged-cats grid, no new automated visual tests — all explicitly out of scope per `docs/superpowers/specs/2026-07-02-app-wide-visual-redesign-design.md`.

---

### Task 1: Design tokens — colors, radius, warm shadows

**Files:**

- Modify: `app/globals.css` (full `:root`/`.dark` block replacement + `--radius`)
- Modify: `components/ui/card.tsx:15`
- Modify: `components/ui/button.tsx:11`
- Modify: `app/(app)/components/bottom-nav.tsx:30`

**Interfaces:**

- Produces: every CSS custom property consumed by Tailwind utilities (`bg-primary`, `text-foreground`, `border-border`, etc.) app-wide. All later tasks rely on these values existing — no code in later tasks references colors directly, only semantic class names already in place.

- [ ] **Step 1: Replace the color tokens and radius in `app/globals.css`**

Replace the `:root` block (lines 51–84 of the current file) with:

```css
:root {
  --background: #fff7ed;
  --foreground: #2a1b12;
  --card: #ffffff;
  --card-foreground: #2a1b12;
  --popover: #ffffff;
  --popover-foreground: #2a1b12;
  --primary: #f97316;
  --primary-foreground: #ffffff;
  --secondary: #fed7aa;
  --secondary-foreground: #9a3412;
  --muted: #f5ebe0;
  --muted-foreground: #8a6f5f;
  --accent: #fed7aa;
  --accent-foreground: #9a3412;
  --destructive: oklch(0.577 0.245 27.325);
  --border: #f2dfc8;
  --input: #f2dfc8;
  --ring: #f97316;
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 1rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}
```

Replace the `.dark` block (lines 86–118 of the current file) with:

```css
.dark {
  --background: #1c1410;
  --foreground: #fdf3e7;
  --card: #241b15;
  --card-foreground: #fdf3e7;
  --popover: #241b15;
  --popover-foreground: #fdf3e7;
  --primary: #fb923c;
  --primary-foreground: #1c1410;
  --secondary: #3a2a1e;
  --secondary-foreground: #fdba74;
  --muted: #2e241c;
  --muted-foreground: #c4a98c;
  --accent: #3a2a1e;
  --accent-foreground: #fdba74;
  --destructive: oklch(0.704 0.191 22.216);
  --border: #3a2a1e;
  --input: #3a2a1e;
  --ring: #fb923c;
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}
```

Do not change the `@theme inline` block, the `@import` lines, or the `@layer base` block in this step — those are handled in Task 2 (`--font-heading`) or left as-is.

- [ ] **Step 2: Add a warm shadow to `Card`**

In `components/ui/card.tsx`, in the `Card` function's `className`, change:

```typescript
'group/card bg-card text-card-foreground ring-foreground/10 flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl py-(--card-spacing) text-sm ring-1 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
```

to:

```typescript
'group/card bg-card text-card-foreground ring-foreground/10 flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl py-(--card-spacing) text-sm shadow-sm shadow-primary/10 ring-1 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
```

- [ ] **Step 3: Add a warm shadow to the default `Button` variant**

In `components/ui/button.tsx`, change:

```typescript
default: 'bg-primary text-primary-foreground hover:bg-primary/80',
```

to:

```typescript
default: 'bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/80',
```

- [ ] **Step 4: Tint the bottom-nav FAB shadow**

In `app/(app)/components/bottom-nav.tsx`, change:

```typescript
className =
  'bg-primary text-primary-foreground relative -top-4 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95'
```

to:

```typescript
className =
  'bg-primary text-primary-foreground shadow-primary/30 relative -top-4 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95'
```

- [ ] **Step 5: Run verification gate**

```bash
npm run type-check
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 6: Manual check**

```bash
npm run dev
```

Open `http://localhost:3000/login` — confirm the page background is warm cream, the "Sign in" button is orange with a soft warm shadow, and the card has a subtle warm shadow (not the old flat gray shadcn look). Stop the dev server after checking.

- [ ] **Step 7: Commit**

```bash
git add app/globals.css components/ui/card.tsx components/ui/button.tsx "app/(app)/components/bottom-nav.tsx"
git commit -m "style(shell): rebrand color tokens to warm orange palette"
```

---

### Task 2: Root layout — Varela Round heading font, dark mode provider, theme-aware toasts

**Files:**

- Modify: `app/layout.tsx` (full replacement)
- Modify: `app/globals.css:12` (`--font-heading`)
- Create: `app/components/theme-provider.tsx`
- Modify: `components/ui/sonner.tsx` (full replacement)
- Modify: `package.json` / `package-lock.json` (new dependency, via `npm install`)

**Interfaces:**

- Produces: `ThemeProvider` (default export-free named export from `app/components/theme-provider.tsx`), a thin wrapper around `next-themes`' `ThemeProvider` with `attribute="class"`. Consumed by this task's own `app/layout.tsx` edit, and by Task 6's `ThemeToggle` (which calls `useTheme()` from `next-themes` directly — it only needs `ThemeProvider` to be mounted somewhere above it in the tree, which this task guarantees).
- Produces: `--font-heading` CSS variable now resolves to Varela Round instead of Geist — every existing use of the `font-heading` Tailwind class (already present on `CardTitle` in `components/ui/card.tsx:41`) picks this up automatically, no further code changes needed there.

- [ ] **Step 1: Install `next-themes`**

```bash
npm install next-themes
```

Expected: `package.json` gains `"next-themes": "^0.4.6"` (or newer patch) under `dependencies`.

- [ ] **Step 2: Create `app/components/theme-provider.tsx`**

```typescript
'use client'

import type { ComponentProps } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

- [ ] **Step 3: Repoint `--font-heading` in `app/globals.css`**

Change:

```css
--font-heading: var(--font-sans);
```

to:

```css
--font-heading: var(--font-varela-round);
```

- [ ] **Step 4: Replace `app/layout.tsx`**

```typescript
import type { Metadata, Viewport } from 'next'
import { Geist, Varela_Round } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from './components/theme-provider'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })
const varelaRound = Varela_Round({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-varela-round',
})

export const metadata: Metadata = {
  title: 'Cat-A-Log',
  description: 'Crowdsourced stray cat registry — tag, track, and identify strays in your area.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Cat-A-Log',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={varelaRound.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${geist.className} bg-background text-foreground antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Make toasts follow the explicit theme choice, not just OS preference**

Replace `components/ui/sonner.tsx` in full:

```typescript
'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react'

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps['theme']) ?? 'system'}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
```

- [ ] **Step 6: Run verification gate**

```bash
npm run type-check
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 7: Manual check**

```bash
npm run dev
```

Open `http://localhost:3000/login` — confirm "Welcome back" and "Cat-A-Log" render in the rounder Varela Round typeface (visibly different from the body text). In devtools, toggle `class="dark"` on the `<html>` element — confirm the page switches to the warm dark palette. Stop the dev server after checking.

- [ ] **Step 8: Commit**

```bash
git add app/layout.tsx app/globals.css app/components/theme-provider.tsx components/ui/sonner.tsx package.json package-lock.json
git commit -m "feat(shell): add Varela Round heading font and dark mode provider"
```

---

### Task 3: Auth pages — icon badge and heading font

**Files:**

- Modify: `app/(auth)/login/page.tsx:1-81`
- Modify: `app/(auth)/register/page.tsx:1-70`
- Modify: `app/(auth)/setup-profile/page.tsx:1-91`

**Interfaces:**

- Consumes: `font-heading` Tailwind class (Task 2), `Cat` icon from `lucide-react` (already a dependency).
- Produces: nothing consumed by later tasks — this task's output is only visible in the browser.

- [ ] **Step 1: Update the logo block in `app/(auth)/login/page.tsx`**

Add the import:

```typescript
import { Cat } from 'lucide-react'
```

Change:

```typescript
      {/* Logo */}
      <div className="mb-8 text-center">
        <span className="text-4xl">🐱</span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Cat-A-Log</h1>
        <p className="text-muted-foreground mt-1 text-sm">Tag the strays in your area</p>
      </div>
```

to:

```typescript
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="bg-primary text-primary-foreground mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
          <Cat className="h-7 w-7" />
        </div>
        <h1 className="font-heading mt-3 text-2xl font-bold tracking-tight">Cat-A-Log</h1>
        <p className="text-muted-foreground mt-1 text-sm">Tag the strays in your area</p>
      </div>
```

- [ ] **Step 2: Update the logo block in `app/(auth)/register/page.tsx`**

Add the import:

```typescript
import { Cat } from 'lucide-react'
```

Apply the identical change as Step 1 (same JSX block, same before/after text) to `app/(auth)/register/page.tsx`.

- [ ] **Step 3: Update the logo block in `app/(auth)/setup-profile/page.tsx`**

Add the import:

```typescript
import { Cat } from 'lucide-react'
```

Change:

```typescript
      <div className="mb-8 text-center">
        <span className="text-4xl">🐾</span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">One last step</h1>
        <p className="text-muted-foreground mt-1 text-sm">Choose your Cat-A-Log username</p>
      </div>
```

to:

```typescript
      <div className="mb-8 text-center">
        <div className="bg-primary text-primary-foreground mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
          <Cat className="h-7 w-7" />
        </div>
        <h1 className="font-heading mt-3 text-2xl font-bold tracking-tight">One last step</h1>
        <p className="text-muted-foreground mt-1 text-sm">Choose your Cat-A-Log username</p>
      </div>
```

- [ ] **Step 4: Run verification gate**

```bash
npm run type-check
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 5: Manual check**

```bash
npm run dev
```

Visit `/login`, `/register`, and `/setup-profile` — confirm each shows a rounded orange badge with a white cat icon instead of an emoji, and no 🐱/🐾 characters remain on any of the three pages. Stop the dev server after checking.

- [ ] **Step 6: Commit**

```bash
git add "app/(auth)/login/page.tsx" "app/(auth)/register/page.tsx" "app/(auth)/setup-profile/page.tsx"
git commit -m "style(auth): replace emoji logo with Lucide icon badge"
```

---

### Task 4: Tag flow — step progress indicator and screen transitions

**Files:**

- Create: `app/(app)/tag/components/step-dots.tsx`
- Modify: `app/(app)/tag/page.tsx` (full replacement)
- Modify: `app/(app)/tag/components/photo-screen.tsx:114`
- Modify: `app/(app)/tag/components/candidates-screen.tsx:88`
- Modify: `app/(app)/tag/components/match-found-screen.tsx:68`
- Modify: `app/(app)/tag/components/name-screen.tsx:14`
- Modify: `app/(app)/tag/components/details-screen.tsx:87`

**Interfaces:**

- Produces: `StepDots({ currentStep, totalSteps }: { currentStep: number; totalSteps: number })`, a presentational component used only by `app/(app)/tag/page.tsx` in this task.
- Consumes: nothing new — the five screen components' props (`onNext`, `onMatch`, `onNoMatch`, etc.) are unchanged from the existing `tag-catch-flow` implementation; only their outer wrapper `className` changes.

- [ ] **Step 1: Create `app/(app)/tag/components/step-dots.tsx`**

```typescript
import { cn } from '@/lib/utils'

export function StepDots({
  currentStep,
  totalSteps,
}: {
  currentStep: number
  totalSteps: number
}) {
  return (
    <div className="fixed inset-x-0 top-0 z-40 flex justify-center gap-1.5 pt-3">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <span
          key={step}
          className={cn(
            'h-1.5 rounded-full transition-all duration-150',
            step <= currentStep ? 'bg-primary w-6' : 'bg-muted w-1.5'
          )}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Wire `StepDots` into the orchestrator — replace `app/(app)/tag/page.tsx` in full**

```typescript
'use client'

import { useState } from 'react'
import { PhotoScreen } from './components/photo-screen'
import { CandidatesScreen } from './components/candidates-screen'
import { MatchFoundScreen } from './components/match-found-screen'
import { NameScreen } from './components/name-screen'
import { DetailsScreen } from './components/details-screen'
import { StepDots } from './components/step-dots'
import type { NearbyCat } from '@/lib/supabase/types'

type Screen =
  | { type: 'photo' }
  | { type: 'candidates'; photoUrl: string; lat: number; lng: number }
  | { type: 'match-found'; cat: NearbyCat; photoUrl: string; lat: number; lng: number }
  | { type: 'name'; photoUrl: string; lat: number; lng: number }
  | { type: 'details'; photoUrl: string; lat: number; lng: number; catName: string }

const STEP_INDEX: Record<Screen['type'], number> = {
  photo: 1,
  candidates: 2,
  'match-found': 3,
  name: 3,
  details: 4,
}

export default function TagPage() {
  const [screen, setScreen] = useState<Screen>({ type: 'photo' })
  const totalSteps = screen.type === 'match-found' ? 3 : 4

  return (
    <>
      <StepDots currentStep={STEP_INDEX[screen.type]} totalSteps={totalSteps} />
      {renderScreen(screen, setScreen)}
    </>
  )
}

function renderScreen(screen: Screen, setScreen: (screen: Screen) => void) {
  switch (screen.type) {
    case 'photo':
      return (
        <PhotoScreen
          onNext={({ photoUrl, lat, lng }) => setScreen({ type: 'candidates', photoUrl, lat, lng })}
        />
      )

    case 'candidates':
      return (
        <CandidatesScreen
          photoUrl={screen.photoUrl}
          lat={screen.lat}
          lng={screen.lng}
          onMatch={(cat) =>
            setScreen({
              type: 'match-found',
              cat,
              photoUrl: screen.photoUrl,
              lat: screen.lat,
              lng: screen.lng,
            })
          }
          onNoMatch={() =>
            setScreen({ type: 'name', photoUrl: screen.photoUrl, lat: screen.lat, lng: screen.lng })
          }
        />
      )

    case 'match-found':
      return (
        <MatchFoundScreen
          cat={screen.cat}
          photoUrl={screen.photoUrl}
          lat={screen.lat}
          lng={screen.lng}
        />
      )

    case 'name':
      return (
        <NameScreen
          onNext={(catName) =>
            setScreen({
              type: 'details',
              photoUrl: screen.photoUrl,
              lat: screen.lat,
              lng: screen.lng,
              catName,
            })
          }
        />
      )

    case 'details':
      return (
        <DetailsScreen
          name={screen.catName}
          photoUrl={screen.photoUrl}
          lat={screen.lat}
          lng={screen.lng}
        />
      )
  }
}
```

- [ ] **Step 3: Add screen-transition animation + top clearance to each screen's wrapper**

In `app/(app)/tag/components/photo-screen.tsx`, change:

```typescript
    <div className="mx-auto max-w-sm px-4 py-6">
```

to:

```typescript
    <div className="mx-auto max-w-sm px-4 pt-10 pb-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-200">
```

In `app/(app)/tag/components/candidates-screen.tsx`, change the same pattern (the main content `div`, not the `Checking nearby cats…` loading state `div`):

```typescript
    <div className="mx-auto max-w-sm px-4 py-6">
```

to:

```typescript
    <div className="mx-auto max-w-sm px-4 pt-10 pb-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-200">
```

In `app/(app)/tag/components/match-found-screen.tsx`, change:

```typescript
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-4 py-6 text-center">
```

to:

```typescript
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-4 pt-10 pb-6 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-200">
```

In `app/(app)/tag/components/name-screen.tsx`, change:

```typescript
    <div className="mx-auto max-w-sm px-4 py-6">
```

to:

```typescript
    <div className="mx-auto max-w-sm px-4 pt-10 pb-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-200">
```

In `app/(app)/tag/components/details-screen.tsx`, change:

```typescript
    <div className="mx-auto max-w-sm px-4 py-6">
```

to:

```typescript
    <div className="mx-auto max-w-sm px-4 pt-10 pb-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-200">
```

- [ ] **Step 4: Run verification gate**

```bash
npm run type-check
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 5: Manual check**

```bash
npm run dev
```

Visit `/tag`, click through Photo → Candidates → (Not this cat) → Name → Details. Confirm: dots at the top show 1 of 4, 2 of 4, 3 of 4, 4 of 4 filling left-to-right in orange as you progress; each screen fades/slides in instead of popping instantly; content doesn't sit underneath the dots bar. In OS accessibility settings, enable "reduce motion," reload, and confirm the screens now appear instantly (no slide/fade). Stop the dev server after checking.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/tag/page.tsx" "app/(app)/tag/components/step-dots.tsx" "app/(app)/tag/components/photo-screen.tsx" "app/(app)/tag/components/candidates-screen.tsx" "app/(app)/tag/components/match-found-screen.tsx" "app/(app)/tag/components/name-screen.tsx" "app/(app)/tag/components/details-screen.tsx"
git commit -m "feat(tag): add step progress dots and screen transitions"
```

---

### Task 5: `/map` visual shell

**Files:**

- Modify: `app/(app)/map/page.tsx` (full replacement)

**Interfaces:**

- Produces: nothing consumed elsewhere — this is a leaf page. No live data, no map library; a follow-up task (out of scope here) will replace the placeholder surface with real map tiles.

- [ ] **Step 1: Replace `app/(app)/map/page.tsx` in full**

```typescript
import { Cat, MapPin, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function MapPage() {
  return (
    <div className="relative h-screen overflow-hidden">
      {/* Placeholder map surface — live map library integration is separate follow-up work */}
      <div className="bg-secondary/40 absolute inset-0" aria-hidden="true" />

      <div className="absolute inset-x-4 top-4 flex items-center gap-2">
        <div className="border-border bg-card text-muted-foreground flex flex-1 items-center gap-2 rounded-full border px-4 py-2.5 shadow-sm">
          <Search className="h-4 w-4 shrink-0" />
          <span className="text-sm">Search this area</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="bg-card shrink-0 rounded-full shadow-sm"
          aria-label="Filter cats"
        >
          <SlidersHorizontal />
        </Button>
      </div>

      <Card className="absolute inset-x-4 bottom-24 flex-row items-center gap-3 p-3 shadow-lg">
        <div className="bg-secondary flex h-16 w-16 shrink-0 items-center justify-center rounded-lg">
          <Cat className="text-secondary-foreground h-8 w-8" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-heading font-medium">Mochi</p>
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <MapPin className="h-3 w-3" />
            <span>120m away</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Run verification gate**

```bash
npm run type-check
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 3: Manual check**

```bash
npm run dev
```

Visit `/map` at a 375px viewport width. Confirm: warm-tan full-bleed placeholder surface, a floating search pill + filter button near the top that doesn't collide with any browser chrome, a cat preview card near the bottom that doesn't overlap the bottom nav, no emoji anywhere, no horizontal scroll. Stop the dev server after checking.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/map/page.tsx"
git commit -m "feat(map): add visual shell for map page"
```

---

### Task 6: `/profile/me` — avatar, username, bio, sign-out, dark mode toggle

**Files:**

- Create: `app/(app)/profile/me/components/sign-out-button.tsx`
- Create: `app/(app)/profile/me/components/theme-toggle.tsx`
- Modify: `app/(app)/profile/me/page.tsx` (full replacement — becomes a Server Component)

**Interfaces:**

- Consumes: `createClient` from `@/lib/supabase/server` (async server client, per `AGENTS.md`), `Profile` row shape (`username`, `avatar_url`, `bio`) from `@/lib/supabase/types`, `useTheme` from `next-themes` (Task 2).
- Produces: `SignOutButton()` and `ThemeToggle()`, both used only by this page.

- [ ] **Step 1: Create `app/(app)/profile/me/components/sign-out-button.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function SignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    router.push('/login')
  }

  return (
    <Button variant="outline" className="w-full" onClick={handleSignOut} disabled={loading}>
      {loading ? 'Signing out…' : 'Sign out'}
    </Button>
  )
}
```

- [ ] **Step 2: Create `app/(app)/profile/me/components/theme-toggle.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <Button type="button" variant="outline" size="icon" aria-label="Toggle theme" disabled>
        <Sun />
      </Button>
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  )
}
```

- [ ] **Step 3: Replace `app/(app)/profile/me/page.tsx` in full**

```typescript
import { redirect } from 'next/navigation'
import { User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from './components/sign-out-button'
import { ThemeToggle } from './components/theme-toggle'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url, bio')
    .eq('id', user.id)
    .single()

  const initials = profile?.username ? profile.username.slice(0, 2).toUpperCase() : null

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 px-4 py-6 text-center">
      <div className="flex w-full justify-end">
        <ThemeToggle />
      </div>

      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatar_url}
          alt={profile.username}
          className="border-border h-24 w-24 rounded-full border object-cover"
        />
      ) : (
        <div className="bg-primary text-primary-foreground flex h-24 w-24 items-center justify-center rounded-full text-2xl font-semibold">
          {initials ?? <User className="h-10 w-10" />}
        </div>
      )}

      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {profile?.username ? `@${profile.username}` : 'Your profile'}
        </h1>
        {profile?.bio && <p className="text-muted-foreground text-sm">{profile.bio}</p>}
      </div>

      <SignOutButton />
    </div>
  )
}
```

- [ ] **Step 4: Run verification gate**

```bash
npm run type-check
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 5: Manual check**

```bash
npm run dev
```

Sign in and visit `/profile/me`. Confirm: an initials (or generic user icon) avatar in an orange circle, your `@username`, bio if set, a working sign-out button, and a sun/moon toggle in the top-right. Click the toggle — confirm the whole app switches between light and dark instantly (no flash of the wrong theme on reload), and that the choice persists across a page reload. Stop the dev server after checking.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/profile/me/page.tsx" "app/(app)/profile/me/components/sign-out-button.tsx" "app/(app)/profile/me/components/theme-toggle.tsx"
git commit -m "feat(profile): build profile page with avatar, bio, and theme toggle"
```

---

### Task 7: Full verification pass

**Files:** none (verification only, no commit)

- [ ] **Step 1: Run the full CI-equivalent gate**

```bash
npm run format:check
npm run lint
npm run type-check
npm run build
```

Expected: all four pass with zero errors.

- [ ] **Step 2: Manual walkthrough**

```bash
npm run dev
```

At a 375px viewport, in both light mode and dark mode (toggle from `/profile/me`), walk every screen: `/login` → `/register` → `/setup-profile` → `/map` → `/tag` (all 5 screens, including the match-found branch) → `/profile/me`. Confirm for each:

- No emoji remain anywhere touched by this plan (🐱 on login/register/setup-profile, 🗺️/🐾 on map/profile placeholders).
- Text contrast looks correct in both themes (no light-gray-on-white or dark-on-dark text).
- All touch targets (buttons, nav items, the theme toggle) are comfortably tappable.
- No horizontal scroll on any page.
- Focus rings are visible when tabbing through form fields and buttons.
- Tag flow screen transitions feel smooth, not jarring or sluggish; step dots track progress correctly.

Stop the dev server when done. This step has no commit — it's a checkpoint, not a code change.
