# Google Sign-In/Register — Design

## Goal

Add "Continue with Google" / "Sign up with Google" to the `/login` and `/register` pages, alongside the existing email/password forms.

## Prerequisites (already done by the user)

- Google provider configured in Supabase Dashboard → Authentication → Providers (Client ID/Secret from a Google Cloud OAuth consent screen).

## Prerequisites (still required, not automatable here)

- Add the callback URL to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
  - `http://localhost:<dev-port>/auth/callback` for local dev
  - `https://<production-domain>/auth/callback` once deployed

## Architecture & data flow

1. User clicks the Google button on `/login` or `/register`. Client calls:
   ```ts
   supabase.auth.signInWithOAuth({
     provider: 'google',
     options: { redirectTo: `${window.location.origin}/auth/callback` },
   })
   ```
   Browser redirects to Google's consent screen.
2. User approves → Google → Supabase's auth server → browser redirected back to `app/auth/callback/route.ts?code=...`.
3. The route handler (server-side, using the existing `lib/supabase/server.ts` client — same client `proxy.ts` already uses) exchanges the code for a session:
   ```ts
   const { error } = await supabase.auth.exchangeCodeForSession(code)
   ```
   This sets the auth cookies.
4. It then checks the `profiles` table for `id = user.id`:

   - No row → redirect to `/setup-profile`
   - Row exists → redirect to `/map`

   `/setup-profile` itself needs **no changes** — it already inserts using `auth.uid()`, which is identical for Google-authenticated users.

5. `proxy.ts`'s `PUBLIC_ROUTES` gets `/auth/callback` added. Without this, the proxy would see "no session yet" on that exact request (the callback is what _establishes_ the session) and redirect to `/login` before the exchange ever runs.

## Components

- **`components/google-button.tsx`** (new, Client Component) — the only piece with real logic (the OAuth call, a disabled/loading state during redirect, error toast on failure). Shared between `/login` and `/register` via a `label` prop (`"Continue with Google"` vs `"Sign up with Google"`). Renders the existing shadcn `Button` (`variant="outline"`, `className="w-full"`) with Google's official 4-color "G" logomark (18px) + label. No new colors or type — inherits all existing tokens.
- **Divider** (`── or continue with email ──`) — inlined directly in each page, not extracted into a component. It's markup only (no logic), used in exactly two places; a shared component would be indirection without behavior.
- Placement on both pages: existing form, then divider, then `<GoogleButton label="..." />` — Google as the secondary path, email as primary (per user's explicit choice).

## Error handling

- **Client-side failure** (rare — provider misconfigured, offline before redirect fires): `signInWithOAuth` returns `error` → `GoogleButton` shows `toast.error(error.message)`, matching the existing email/password form pattern.
- **Callback failure** (expired/invalid code, or user denies consent at Google's screen — Supabase redirects back with an `error` param instead of `code`): the route handler redirects to `/login?oauth_error=1` instead of throwing. `/login` checks for that query param on mount and shows `toast.error('Google sign-in failed. Try again.')`. No new error page — reuses the existing toast pattern.

## Testing / verification

No test framework exists in this repo (no `npm test` script). Verification is the same CI gate as the rest of the app: `type-check`, `lint`, `build`. A full end-to-end pass (real Google account clicking through an actual consent screen) isn't automatable in this environment and is called out as a manual step for the user, same limitation encountered when verifying the sign-out button.

## Explicitly out of scope

- Other OAuth providers (GitHub, Apple, etc.)
- Auto-generating a username to skip `/setup-profile` for Google users (user chose to keep the existing setup-profile flow for all sign-up paths)
- Any change to email/password auth behavior
