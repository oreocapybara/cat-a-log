# Cat-A-Log

A crowdsourced stray cat registry. Tag cats you spot with a photo and GPS location, view them on a map, and vote on whether two records are the same animal. Built as a mobile-first progressive web app.

**Stack:** Next.js 16 · TypeScript · Supabase · Tailwind CSS

## Prerequisites

Before you begin, make sure you have:

- [Node.js 20+](https://nodejs.org/) (includes npm)
- [Git](https://git-scm.com/)
- A [Supabase](https://supabase.com/) account (free tier works)

## Clone & Install

```bash
git clone <repo-url>
cd Cat-A-Log
npm ci
```

`npm ci` installs dependencies from the lockfile. It also sets up Git hooks (via Husky) that lint and format your code on commit.

## Supabase Setup

1. Go to [supabase.com](https://supabase.com/) and create a new project. Pick any name and region. You'll be asked to set a database password — save it somewhere, though you won't need it directly.

2. Once the project is created, go to **Project Settings → API**. You'll need two values from this page:

   - **Project URL** (e.g. `https://abcdefgh.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

3. Link your local project to Supabase. Your project ref is the subdomain in your Project URL (the `abcdefgh` part):

   ```bash
   npx supabase link --project-ref <your-project-ref>
   ```

   If you haven't installed the Supabase CLI globally, `npx` will download it automatically. For a permanent install, see the [Supabase CLI docs](https://supabase.com/docs/guides/cli/getting-started).

4. Apply the database schema:

   ```bash
   npx supabase db push
   ```

   This creates all tables, functions, storage buckets, and security policies. You don't need to run any SQL manually.

## Environment Variables

Copy the template and fill in your values:

```bash
cp .env.example .env.local
```

| Variable                        | Where to find it                                          | Required |
| ------------------------------- | --------------------------------------------------------- | -------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase → Project Settings → API → Project URL           | Yes      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key       | Yes      |
| `VOYAGE_API_KEY`                | [voyageai.com](https://voyageai.com/) — create an API key | Optional |

The Voyage API key powers photo similarity search (finding visually similar cats). The app runs without it, but that feature will be disabled.

## Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app will redirect to the login page. To sign in, you need to set up Google OAuth below.

The first start may take a moment while Next.js compiles.

## Google OAuth Setup

Google OAuth is the sign-in method. Without it, you can't log in.

### 1. Create Google OAuth credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth Client ID**
5. Choose **Web application** as the application type
6. Under **Authorized redirect URIs**, add:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   Replace `<your-project-ref>` with your Supabase project ref.
7. Click **Create** and copy the **Client ID** and **Client Secret**

If Google asks you to configure an OAuth consent screen first, set it to "External" and fill in the required fields (app name and email). You can leave optional fields blank.

### 2. Configure Supabase

1. In your Supabase dashboard, go to **Authentication → Providers**
2. Find **Google** and toggle it on
3. Paste your Client ID and Client Secret

### 3. Set redirect URLs

1. In Supabase, go to **Authentication → URL Configuration**
2. Set:
   - **Site URL:** `http://localhost:3000`
   - **Redirect URLs:** `http://localhost:3000/auth/callback`

For production or Vercel preview deployments, add those domains to both the Google Console redirect URIs and the Supabase redirect URLs list.

## Available Scripts

| Command                | What it does                     |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Start development server         |
| `npm run build`        | Production build                 |
| `npm run lint`         | Run ESLint                       |
| `npm run format`       | Format all files with Prettier   |
| `npm run format:check` | Check formatting without writing |
| `npm run type-check`   | TypeScript type checking         |

## Project Structure

```
app/          → Pages and routes (Next.js App Router)
  (app)/      → Authenticated app shell (map, tag, profile)
  (auth)/     → Login, register, setup-profile
components/   → Shared UI primitives (shadcn/ui)
lib/          → Utilities, Supabase clients, helpers
supabase/     → Database migrations
public/       → Static assets, service worker, manifest
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development workflow, commit conventions, and CI details.

## License

[AGPL-3.0](./LICENSE)
