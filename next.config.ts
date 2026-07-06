import path from 'node:path'
import type { NextConfig } from 'next'

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
  // Connect: self, blob (canvas/image exports), Supabase (auth + realtime + storage), CARTO tiles (fetched by Leaflet)
  "connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://*.basemaps.cartocdn.com",
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

export default nextConfig
