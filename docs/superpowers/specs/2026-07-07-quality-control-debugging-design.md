# Quality Control & Debugging Infrastructure

**Date:** 2026-07-07  
**Status:** Approved  
**Scope:** Error boundaries, Sentry, Playwright E2E, coverage, bundle analysis, Lighthouse CI, not-found page, dev logging, CI restructure

---

## Overview

Add a comprehensive quality control and debugging layer to Cat-A-Log. This covers runtime error handling (error boundaries + Sentry), automated testing (Playwright E2E), quality metrics (coverage thresholds, bundle analysis, Lighthouse), and developer experience (dev logging). The CI pipeline is restructured into 3 parallel jobs.

---

## 1. Error Boundaries + Not-Found Page

### Files

| File                   | Type             | Purpose                                                                                                                    |
| ---------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `app/global-error.tsx` | Client Component | Catches root layout errors. Renders its own `<html>/<body>`. Full-page "Something went wrong" screen with retry button.    |
| `app/(app)/error.tsx`  | Client Component | Catches errors within the authenticated shell. Renders error card inside existing layout (bottom nav stays). Retry button. |
| `app/not-found.tsx`    | Server Component | Branded 404 page. Cat-themed "Page not found" with link to `/map`. Orange theme, mobile-first.                             |

### Behavior

- `global-error.tsx` must render its own HTML shell since the root layout has crashed.
- `error.tsx` receives `error` and `reset` props from Next.js.
- Both error files call `Sentry.captureException(error)` in a `useEffect`.
- `not-found.tsx` is statically rendered — no client JS needed.

---

## 2. Sentry Integration

### Package

`@sentry/nextjs` — single SDK covering client, server, and edge runtimes.

### Files

| File                        | Purpose                                                                   |
| --------------------------- | ------------------------------------------------------------------------- |
| `sentry.client.config.ts`   | Browser-side Sentry init. DSN from `NEXT_PUBLIC_SENTRY_DSN`.              |
| `sentry.server.config.ts`   | Server-side Sentry init.                                                  |
| `sentry.edge.config.ts`     | Edge runtime init (for `proxy.ts`).                                       |
| `app/instrumentation.ts`    | Next.js instrumentation hook — imports server/edge configs.               |
| `next.config.ts` (modified) | Wrapped with `withSentryConfig()` for source maps + auto-instrumentation. |

### Configuration

- **Sample rate:** 1.0 in development, 0.1 in production (tunable).
- **Replay:** Disabled (keeps bundle small).
- **Performance tracing:** Disabled initially (can enable later).
- **Source maps:** Uploaded during CI build via `SENTRY_AUTH_TOKEN`.

### Environment Variables (new)

| Variable                 | Scope            | Purpose                          |
| ------------------------ | ---------------- | -------------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN` | Public           | Sentry project DSN               |
| `SENTRY_AUTH_TOKEN`      | Secret (CI only) | Source map upload authentication |
| `SENTRY_ORG`             | Secret (CI only) | Sentry organization slug         |
| `SENTRY_PROJECT`         | Secret (CI only) | Sentry project slug              |

### Error Boundary Integration

Both `global-error.tsx` and `app/(app)/error.tsx` call `Sentry.captureException(error)` inside a `useEffect` when an error is caught.

---

## 3. Playwright E2E Tests

### Package

`@playwright/test`

### Structure

```
playwright.config.ts     # Root config
e2e/
  auth.setup.ts          # Global setup — creates fake authenticated session (storageState)
  auth.spec.ts           # Auth flow smoke test
  tag-cat.spec.ts        # Tag a cat flow
  map.spec.ts            # Map renders
  not-found.spec.ts      # 404 page
```

### Config (`playwright.config.ts`)

- **Base URL:** `http://localhost:3000`
- **Web server:** `npm run start` (uses build artifact in CI)
- **Browsers:** Chromium only (fast CI, add more later)
- **Retries:** 1 in CI, 0 locally
- **Reporter:** HTML (uploaded as artifact on failure)

### Test Descriptions

| Test                | What it validates                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `auth.spec.ts`      | Intercepts Supabase OAuth callback, sets session cookie, verifies redirect to `/map`                          |
| `tag-cat.spec.ts`   | Uses pre-authenticated state. Navigates to `/tag`, uploads photo, fills form, submits. Asserts success toast. |
| `map.spec.ts`       | Uses pre-authenticated state. Navigates to `/map`, asserts `.leaflet-container` exists.                       |
| `not-found.spec.ts` | Hits `/some-bogus-url`, asserts branded 404 content is visible.                                               |

### Auth Mocking Strategy

A global setup script (`e2e/auth.setup.ts`) creates a pre-authenticated `storageState` by setting the expected Supabase session cookies. Tests that need auth reference this state via `use: { storageState }` in the config's projects array.

---

## 4. Coverage Reporting

### Package

`@vitest/coverage-v8`

### Config (in `vitest.config.ts`)

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'lcov'],
  include: ['lib/**', 'app/**', 'components/**'],
  thresholds: {
    'lib/**': {
      statements: 60,
      branches: 60,
      functions: 60,
      lines: 60,
    },
  },
}
```

### Behavior

- `lib/` has a hard 60% threshold — CI fails if it drops below.
- Everything else (app/, components/) gets coverage collected and reported but does not gate the build.
- Reports: `text` for terminal output, `lcov` for potential future integration with coverage services.

### Script

```json
"test:coverage": "vitest run --coverage"
```

---

## 5. Bundle Analysis

### Package

`@next/bundle-analyzer`

### Config (in `next.config.ts`)

Conditionally wraps the config when `ANALYZE=true`:

```ts
import withBundleAnalyzer from '@next/bundle-analyzer'

// Applied conditionally:
const config = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig)
```

Generates interactive HTML treemaps in `.next/analyze/` for both client and server bundles.

### Script

```json
"analyze": "ANALYZE=true next build"
```

### CI Integration

- Runs in the `quality` job with `ANALYZE=true`.
- Uploads HTML report as a build artifact.
- Non-blocking — never fails the build.

---

## 6. Lighthouse CI

### Package

`@lhci/cli` (dev dependency)

### Config (`lighthouserc.js`)

```js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      url: [
        'http://localhost:3000/login',
        'http://localhost:3000/map',
        'http://localhost:3000/tag',
      ],
      startServerReadyPattern: 'Ready',
      numberOfRuns: 1,
    },
    assert: {
      // Report-only — no assertions
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
```

### Behavior

- **Report-only mode** — no score thresholds, never fails the build.
- Audits 3 URLs: `/login` (public), `/map` and `/tag` (will redirect to `/login` due to auth proxy — still catches performance/accessibility regressions on the login page under load).
- Uploads to Lighthouse CI temporary public storage — generates a shareable report URL in job output.
- Authenticated Lighthouse runs can be added later via `puppeteerScript`.

---

## 7. Dev Logging

### Change (in `next.config.ts`)

Add to the Next.js config object:

```ts
logging: {
  fetches: {
    fullUrl: true,
  },
}
```

### Behavior

- All `fetch()` calls (including Supabase client internals) log their full URL and cache status (`HIT`, `MISS`, `SKIP`) to the terminal during development.
- Zero dependencies, zero runtime code.
- Only active in `next dev`, not in production builds.

---

## 8. CI Pipeline Structure (Parallel Jobs)

### Architecture

```
┌─────────────┐
│  lint-build  │  (runs first, produces build artifact)
└──────┬───────┘
       │ artifact: .next/
       ├────────────────────┐
       ▼                    ▼
┌─────────────┐    ┌──────────────┐
│     e2e      │    │   quality    │
└─────────────┘    └──────────────┘
```

### Job Details

#### `lint-build` (gates merge)

1. `npm ci`
2. `npm run format:check`
3. `npm run lint`
4. `npm run type-check`
5. `npm run build` (with Sentry source map upload)
6. Upload `.next/` as artifact (excluding `node_modules/` — too large)

#### `e2e` (gates merge, depends on `lint-build`)

1. `npm ci`
2. Download `.next/` build artifact
3. `npx playwright install --with-deps chromium`
4. `npx playwright test`
5. Upload HTML report as artifact (on failure)

#### `quality` (partially gates merge, depends on `lint-build`)

1. `npm ci`
2. Download `.next/` build artifact
3. `npm run test:coverage` — **fails build if lib/ < 60%**
4. `ANALYZE=true npm run build` — separate analysis build; uploads HTML treemap as artifact (non-blocking, `continue-on-error: true`)
5. `npx lhci autorun` — uses downloaded `.next/` build; uploads report (non-blocking, `continue-on-error: true`)

### Secrets Required (new)

Add to GitHub repository settings (Settings → Secrets → Actions):

- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `NEXT_PUBLIC_SENTRY_DSN` (can also be a variable, not a secret — it's public)

### Existing Secrets (unchanged)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Dependencies Summary

### New Production Dependencies

| Package          | Purpose                                   |
| ---------------- | ----------------------------------------- |
| `@sentry/nextjs` | Error monitoring (client + server + edge) |

### New Dev Dependencies

| Package                 | Purpose                       |
| ----------------------- | ----------------------------- |
| `@playwright/test`      | E2E testing framework         |
| `@vitest/coverage-v8`   | Coverage reporting for Vitest |
| `@next/bundle-analyzer` | Bundle size visualization     |
| `@lhci/cli`             | Lighthouse CI runner          |

---

## Files Created/Modified Summary

### New Files

- `app/global-error.tsx`
- `app/(app)/error.tsx`
- `app/not-found.tsx`
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `app/instrumentation.ts`
- `playwright.config.ts`
- `e2e/auth.setup.ts`
- `e2e/auth.spec.ts`
- `e2e/tag-cat.spec.ts`
- `e2e/map.spec.ts`
- `e2e/not-found.spec.ts`
- `lighthouserc.js`

### Modified Files

- `next.config.ts` — Sentry wrapper + bundle analyzer + dev logging
- `vitest.config.ts` — coverage configuration
- `package.json` — new deps + scripts
- `.github/workflows/ci.yml` — restructured into 3 parallel jobs
- `.env.example` — new Sentry env vars documented
- `.gitignore` — add Playwright artifacts, coverage output, bundle analysis output
