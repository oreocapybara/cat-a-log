import path from 'node:path'
import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'
import withBundleAnalyzer from '@next/bundle-analyzer'

// Content Security Policy directives.
// next/font self-hosts fonts, so no external font-src needed.
// The SW registration script in layout.tsx uses dangerouslySetInnerHTML,
// requiring 'unsafe-inline' for script-src (or a nonce — Next.js 16 doesn't
// yet support per-request nonces in the App Router static shell).
const isDev = process.env.NODE_ENV === 'development'

const cspDirectives = [
  "default-src 'self'",
  // Scripts: self + inline for the SW registration snippet
  // In dev, React requires unsafe-eval for callstack reconstruction
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  // Styles: self + inline (Tailwind injects styles, shadcn uses style attrs)
  "style-src 'self' 'unsafe-inline'",
  // Images: self, Supabase storage (cat photos, avatars), CARTO tiles, blob previews, data URIs
  "img-src 'self' blob: data: https://*.supabase.co https://*.basemaps.cartocdn.com",
  // Fonts: self-hosted by next/font
  "font-src 'self'",
  // Connect: self, blob (canvas/image exports), Supabase (auth + realtime + storage), CARTO tiles (fetched by Leaflet), Sentry
  "connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://*.basemaps.cartocdn.com https://*.ingest.sentry.io",
  // Frames: none needed
  "frame-src 'none'",
  // Objects: disallow plugins
  "object-src 'none'",
  // Base URI: restrict to self
  "base-uri 'self'",
  // Form actions: self only
  "form-action 'self'",
  // Ancestors: prevent framing (clickjacking)
  "frame-ancestors 'none'",
  // Worker: self for the service worker
  "worker-src 'self'",
  // Manifest: self
  "manifest-src 'self'",
]

const cspHeader = cspDirectives.join('; ')

const nextConfig: NextConfig = {
  turbopack: {
    // A parent directory's package-lock.json otherwise gets misdetected as the workspace root.
    root: path.join(__dirname),
  },

  // Dev logging: log all fetch() calls with full URL and cache status
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(self)',
          },
        ],
      },
    ]
  },
}

// Conditionally wrap with bundle analyzer
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

// Wrap with Sentry for source maps + auto-instrumentation
export default withSentryConfig(withAnalyzer(nextConfig), {
  // Suppresses source map upload logs during build
  silent: !process.env.CI,

  // Upload source maps for better error debugging
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps when auth token is available (CI)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Wipe source maps after upload to keep bundle clean
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
})
