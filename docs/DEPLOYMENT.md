# Deployment

Cat-A-Log is a standard Next.js 16 app. It deploys to any platform that supports Node.js 20+ (Vercel, Netlify, Railway, Docker, etc.). Vercel is the zero-config option.

## Vercel (recommended)

1. Push your repo to GitHub.
2. Import the project at [vercel.com/new](https://vercel.com/new).
3. Add environment variables in Settings → Environment Variables:

   | Variable                        | Required | Notes                           |
   | ------------------------------- | -------- | ------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Your Supabase project URL       |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anon/public key        |
   | `VOYAGE_API_KEY`                | No       | Enables photo similarity search |
   | `NEXT_PUBLIC_SENTRY_DSN`        | No       | Sentry error monitoring         |
   | `SENTRY_AUTH_TOKEN`             | No       | For source map uploads in CI    |
   | `SENTRY_ORG`                    | No       | Sentry organization slug        |
   | `SENTRY_PROJECT`                | No       | Sentry project slug             |

4. Deploy. Vercel auto-detects Next.js and uses the correct build settings.

### Preview deployments

Vercel creates preview URLs for every PR branch. Make sure to add each preview domain to:

- **Supabase** → Authentication → URL Configuration → Redirect URLs
- **Google Cloud Console** → OAuth Client → Authorized redirect URIs

Or use a wildcard pattern in Supabase: `https://*-<your-vercel-team>.vercel.app/auth/callback`

## Production checklist

### Supabase

- [ ] Add your production domain to Authentication → URL Configuration → Site URL
- [ ] Add `https://yourdomain.com/auth/callback` to Redirect URLs
- [ ] Add the production domain to the Google OAuth Client's Authorized redirect URIs

### Security headers

Security headers are configured in `next.config.ts` and applied automatically:

- Content-Security-Policy (restricts sources for scripts, images, connections)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(self), geolocation=(self)

The CSP `img-src` and `connect-src` directives already allow `*.supabase.co` and CARTO tile servers. If you use a CDN or custom domain for images, add it to the CSP in `next.config.ts`.

### Error monitoring (Sentry)

Sentry is pre-configured (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`). To enable:

1. Create a project at [sentry.io](https://sentry.io)
2. Set `NEXT_PUBLIC_SENTRY_DSN` in your hosting platform's env vars
3. For source map uploads (better stack traces), also set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` in your CI environment

### PWA

The app is installable as a PWA. The manifest (`public/manifest.json`) and service worker (`public/sw.js`) are served as static files. No additional deployment configuration needed — they work on any HTTPS origin.

## Self-hosting (Docker / Node.js)

```bash
npm ci
npm run build
npm run start
```

The production server runs on port 3000 by default. Set `PORT` env var to change it.

For Docker, use the [official Next.js Docker example](https://github.com/vercel/next.js/tree/canary/examples/with-docker) as a base. Key points:

- Multi-stage build (install → build → production)
- Copy `.next/standalone` for minimal image size
- Expose port 3000
