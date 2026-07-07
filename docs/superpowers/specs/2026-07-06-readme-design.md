# Cat-A-Log README & Installation Guide — Design Spec

**Date:** 2026-07-06
**Status:** Approved
**Approach:** Linear walkthrough (single README, top-to-bottom)

## Summary

Replace the default `create-next-app` README with a beginner-friendly installation guide. Target audience: both developers wanting to contribute and curious non-developers wanting to try the app locally. Tone is neutral-professional.

## Deliverables

1. **README.md** — replaces existing file entirely
2. **.env.example** — new file at project root
3. **CONTRIBUTING.md** — new file at project root (linked from README)

## README Structure

The README reads as a linear walkthrough. Each section builds on the previous one. Ten sections total:

### 1. Header & Introduction

- One-line description: what Cat-A-Log is
- Short paragraph (2–3 sentences): tag cats with photo/GPS, view on map, vote on matches. Mobile-first PWA.
- Compact tech stack list: Next.js 16, TypeScript, Supabase, Tailwind CSS

No badges, no logo, no feature list beyond the summary.

### 2. Prerequisites

Checklist of requirements before setup:

- Node.js 20+ (link to nodejs.org download page)
- npm (comes with Node — mention explicitly so they know it's the package manager used)
- A Supabase account (link to supabase.com, note free tier is sufficient)
- Git (for cloning)

Minimum viable list. No version managers, Docker, or optional tooling.

### 3. Clone & Install

Three commands:

```bash
git clone https://github.com/oreocapybara/cat-a-log.git
cd Cat-A-Log
npm ci
```

Brief explanation:

- `npm ci` does a clean install from the lockfile (since beginners may only know `npm install`)
- Mention that this also sets up git hooks via husky (the `prepare` script)

No alternative package managers mentioned.

### 4. Supabase Setup

Guided-but-concise walkthrough. Steps:

1. Create a new project on supabase.com — any name/region, set a database password (required by Supabase, not directly used)
2. Find API credentials — Project Settings → API. Copy the Project URL and the `anon` public key
3. Install Supabase CLI — link to [Supabase CLI install docs](https://supabase.com/docs/guides/cli/getting-started) (npm, brew, or scoop depending on OS). Recommend `npx supabase` as a zero-install alternative for one-off commands.
4. Link the project — `npx supabase link --project-ref <project-ref>` with explanation of where to find the project ref (in the URL: `https://<project-ref>.supabase.co`)
5. Apply migrations — `npx supabase db push`

Closing note: "You don't need to manually create any tables or run SQL. The migrations handle everything."

### 5. Environment Variables

Instructions:

1. `cp .env.example .env.local`
2. Fill in values, with a reference table:

| Variable                        | Where to find it                                        | Required |
| ------------------------------- | ------------------------------------------------------- | -------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase → Project Settings → API → Project URL         | Yes      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` key | Yes      |
| `VOYAGE_API_KEY`                | voyageai.com — sign up and create an API key            | Optional |

Note below table: The Voyage API key powers visual cat-matching (photo similarity search). The app runs without it, but the "find similar cats" feature won't work.

### 6. Run the Dev Server

```bash
npm run dev
```

- Open http://localhost:3000
- Note: app redirects to login page
- First compilation may take a moment
- Reminder: sign-in requires Google OAuth setup (next section)

### 7. Google OAuth Setup

Clearly labeled separate section. Note that this is required to sign in.

Steps:

1. Google Cloud Console — create a project (or use existing), go to APIs & Services → Credentials → Create OAuth Client ID (Web application)
2. Set authorized redirect URI: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
3. Copy Client ID and Client Secret
4. Configure Supabase — Authentication → Providers → Google → enable, paste Client ID and Secret
5. Set redirect URLs in Supabase — Authentication → URL Configuration:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`

Closing note: for production/Vercel deployment, add production domain to both Google Console redirect URIs and Supabase URL Configuration.

### 8. Available Scripts

Compact reference table:

| Command                | What it does                     |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Start development server         |
| `npm run build`        | Production build                 |
| `npm run lint`         | Run ESLint                       |
| `npm run format`       | Format all files with Prettier   |
| `npm run format:check` | Check formatting without writing |
| `npm run type-check`   | TypeScript type checking         |

No deep explanations.

### 9. Project Structure

High-level directory overview:

```
app/          → Pages and routes (Next.js App Router)
  (app)/      → Authenticated app shell (map, tag, profile)
  (auth)/     → Login, register, setup-profile
components/   → Shared UI primitives (shadcn/ui)
lib/          → Utilities, Supabase clients, helpers
supabase/     → Database migrations
public/       → Static assets, service worker, manifest
```

Directories only, one-line descriptions. Enough to answer "where do I look for X?"

### 10. Footer

- **Contributing:** "See [CONTRIBUTING.md](./CONTRIBUTING.md) for development workflow, commit conventions, and CI details."
- **License:** Placeholder — "TBD" (no license chosen yet)

## .env.example File

New file at project root:

```
# Supabase — Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Voyage AI — optional, powers photo similarity search
# Sign up at https://voyageai.com and create an API key
VOYAGE_API_KEY=
```

Comments explain where to get each value. Values left blank (not placeholder text like "your-key-here") so they can't accidentally be used as-is.

## CONTRIBUTING.md

Separate file covering development workflow. Contents:

- Commit conventions (Conventional Commits format, common types/scopes, examples)
- Code quality: linting (`npm run lint`), formatting (`npm run format`), type-checking (`npm run type-check`)
- Git hooks: husky runs lint-staged on pre-commit, full checks on pre-push
- CI: GitHub Actions runs format:check → lint → type-check → build on every PR
- Branch workflow: don't push directly to main, create PRs

Tone matches README — neutral-professional, concise.

## Constraints

- No screenshots or images
- No badges
- No links to external tutorials (only official docs: Supabase, Node.js, Google Cloud Console)
- `https://github.com/oreocapybara/cat-a-log.git` is the repository URL
- License line is a placeholder until one is chosen

## Out of Scope

- Deployment guide (Vercel setup beyond the OAuth note)
- Docker/containerized setup
- Mobile device testing instructions
- Supabase local development (supabase start)
