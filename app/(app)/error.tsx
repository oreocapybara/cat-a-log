'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Cat, RotateCcw, MapPin } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // TODO: send to error reporting service
    console.error('App shell error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
      {/* Icon */}
      <div className="bg-destructive/10 mb-6 flex h-20 w-20 items-center justify-center rounded-full">
        <Cat className="text-destructive h-10 w-10" />
      </div>

      {/* Copy */}
      <h1 className="font-heading text-2xl font-bold tracking-tight">That didn&apos;t load</h1>
      <p className="text-muted-foreground mt-2 max-w-xs text-sm">
        This page hit an error. Try loading it again, or head back to the map.
      </p>

      {/* Actions */}
      <div className="mt-8 flex gap-3">
        <Button onClick={reset} variant="default" className="h-10 gap-2 px-4 text-sm">
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
        <Link
          href="/map"
          className={cn(buttonVariants({ variant: 'outline' }), 'h-10 gap-2 px-4 text-sm')}
        >
          <MapPin className="h-4 w-4" />
          Go to map
        </Link>
      </div>
    </div>
  )
}
