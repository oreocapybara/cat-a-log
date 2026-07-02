<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Cat-A-Log — Agent Context

## What this app is

Cat-A-Log is a crowdsourced stray cat registry. Logged-in users can tag stray cats they spot (with a photo and GPS coordinates), view cats on a map, and vote on whether two cat records are the same animal. It is a mobile-first PWA.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.10 (App Router) |
| Language | TypeScript 5, strict mode |
| Styling | Tailwind CSS v4 |
| UI components | shadcn/ui (in `components/ui/`) + Base UI (`@base-ui/react`) |
| Icons | Lucide React |
| Auth + DB | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) |
| Forms | React Hook Form + Zod |
| Toasts | Sonner |
| Font | Geist (via `next/font/google`) |

## Critical Next.js 16 differences

- **Middleware is now called Proxy.** The file is `proxy.ts` at the project root (not `middleware.ts`). The exported function must be named `proxy` (not `middleware`). Docs: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
- Do not use `middleware.ts` — it is deprecated and will be ignored.
- Always read `node_modules/next/dist/docs/` before using any Next.js API you are uncertain about.

## Project structure

```
app/
  layout.tsx              # Root layout — Geist font, Toaster, PWA meta, SW registration
  page.tsx                # Root redirect → /map
  globals.css             # Tailwind base styles
  (app)/                  # Route group: authenticated app shell
    layout.tsx            # Wraps children with <main> + <BottomNav>
    map/page.tsx          # /map — placeholder (Day 3)
    tag/page.tsx          # /tag — placeholder (Day 2)
    profile/me/page.tsx   # /profile/me — placeholder (Day 4)
  (auth)/                 # Route group: unauthenticated flows
    login/page.tsx        # /login
    register/page.tsx     # /register
    setup-profile/page.tsx # /setup-profile — username + bio after signup

components/
  bottom-nav.tsx          # Fixed bottom nav: Map | Tag (FAB) | Profile
  ui/                     # shadcn/ui primitives (button, input, card, label, etc.)

lib/
  supabase/
    client.ts             # Browser Supabase client (createBrowserClient)
    server.ts             # Server Supabase client (createServerClient, async)
    types.ts              # Generated Database type + convenience Row types
  utils.ts                # cn() helper (clsx + tailwind-merge)

supabase/
  schema.sql              # Full DB schema — run in Supabase SQL editor

proxy.ts                  # Auth guard + session refresh (replaces middleware.ts)
```

## Supabase clients — always use the right one

| Context | Import |
|---|---|
| Server Components, Server Actions, Route Handlers | `import { createClient } from '@/lib/supabase/server'` — returns a Promise, must be awaited |
| Client Components | `import { createClient } from '@/lib/supabase/client'` |
| Do NOT create a new client inline | Always use these helpers |

The server client is already typed with `Database`. Do not pass env vars directly to `createServerClient` or `createBrowserClient` — the helpers handle that.

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL      # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY # Supabase anon/publishable key
```

Both are referenced as `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`. Do not introduce other variable names.

## Database schema summary

All tables have RLS enabled. See `supabase/schema.sql` for full policies and `lib/supabase/types.ts` for TypeScript types.

**profiles** — one row per user, created manually on `/setup-profile` after signup.
- `id` (uuid, FK → auth.users), `username` (unique, 2–30 chars), `avatar_url`, `bio` (≤160 chars), `tags_count`, `created_at`

**cats** — one record per unique real-world stray.
- `id`, `name` (optional, ≤50 chars), `primary_photo_url`, `lat`, `lng`, `is_ear_tipped`, `notes` (≤500 chars), `tagged_by` (FK → profiles), `confidence_score`, `created_at`

**sightings** — each time a cat is photographed at a location.
- `id`, `cat_id` (FK → cats), `photo_url`, `lat`, `lng`, `spotted_by` (FK → profiles), `created_at`

**match_votes** — proposals that two cat records are the same animal.
- `id`, `cat_a_id`, `cat_b_id`, `proposed_by`, `votes_confirm`, `votes_deny`, `status` (`pending` | `merged` | `rejected`), `created_at`
- `cat_a_id < cat_b_id` is enforced to prevent duplicate pair proposals

**match_vote_entries** — individual community votes on a match proposal.
- `id`, `match_vote_id`, `voted_by`, `vote` (`confirm` | `deny`), `created_at`
- One vote per user per proposal (unique constraint)

**nearby_cats(lat, lng, radius_km)** — SQL function returning cats within a bounding box with `distance_km`.

## Auth flow

1. `/register` → `supabase.auth.signUp` → redirect to `/setup-profile`
2. `/setup-profile` → insert into `profiles` → redirect to `/map`
3. `/login` → `supabase.auth.signInWithPassword` → check if profile row exists → redirect to `/setup-profile` or `/map`
4. `proxy.ts` guards all routes: unauthenticated users hitting non-public routes are redirected to `/login`; authenticated users hitting `/login` or `/register` are redirected to `/map`

Public routes (no auth required): `/login`, `/register`, `/setup-profile`

## UI conventions

- Mobile-first. Max content width is typically `max-w-sm` on auth pages.
- Theme color: orange (`#f97316`, Tailwind `primary`).
- Bottom nav has three items: Map (left), Tag (center FAB, elevated), Profile (right).
- Forms use React Hook Form + Zod. Error messages render as `<p className="text-destructive text-xs">`.
- Toast notifications use `sonner` via `toast.success()` / `toast.error()`.
- `cn()` from `@/lib/utils` for conditional class merging.

## Pages still to be built

- `/map` — interactive map showing tagged cats nearby (planned: Day 3)
- `/tag` — tag a new cat with photo + GPS (planned: Day 2)
- `/profile/me` — user's own profile and their tagged cats (planned: Day 4)
