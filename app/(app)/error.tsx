'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { cn } from '@/lib/utils'

export default function AppError({
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
    <div className="flex flex-1 items-center justify-center p-4">
      <div
        className={cn(
          'w-full max-w-sm rounded-xl border border-orange-200 bg-white p-6 text-center shadow-sm'
        )}
      >
        <p className="text-5xl" role="img" aria-label="Confused cat">
          😿
        </p>
        <h2 className="mt-4 text-xl font-bold text-gray-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-gray-600">
          Don&apos;t worry — the cats are still safe. Try again or head back to the map.
        </p>
        <button
          onClick={reset}
          className="mt-5 w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
