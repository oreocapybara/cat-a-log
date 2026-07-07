'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center bg-[#fff7ed] px-6 text-center font-sans text-[#2a1b12] antialiased">
        {/* Icon */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-red-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Copy */}
        <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-2 max-w-xs text-base text-[#8a6f5f]">
          The app couldn&apos;t recover from an error. Hit the button below to reload.
        </p>

        {/* Recovery */}
        <button
          onClick={reset}
          className="mt-8 inline-flex h-11 cursor-pointer items-center justify-center rounded-lg bg-[#f97316] px-5 text-base font-medium text-white shadow-sm transition-colors hover:bg-[#ea580c] focus-visible:ring-2 focus-visible:ring-[#f97316]/50 focus-visible:outline-none"
        >
          Try again
        </button>
      </body>
    </html>
  )
}
