import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Sample rate: full capture in dev, 10% in production
  sampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Performance tracing disabled initially
  tracesSampleRate: 0,
})
