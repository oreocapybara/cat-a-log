'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export function CatchCardImage({
  src,
  alt,
  isNewCatch,
  className,
}: {
  src: string
  alt: string
  isNewCatch: boolean
  className?: string
}) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      className={cn(
        'relative rounded-[2rem]',
        isNewCatch ? 'catch-card-new' : 'catch-card-existing',
        className
      )}
    >
      {/* Skeleton shimmer placeholder — maintains 9:16 aspect ratio while loading */}
      {!loaded && (
        <div
          className="catch-card-shimmer aspect-[9/16] w-full overflow-hidden rounded-[2rem]"
          aria-hidden="true"
        >
          {/* Faux card structure hints */}
          <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
            <div className="bg-muted-foreground/10 h-3 w-2/3 rounded-full" />
            <div className="bg-muted-foreground/8 w-full flex-1 rounded-xl" />
            <div className="bg-muted-foreground/10 h-2 w-1/2 rounded-full" />
            <div className="bg-muted-foreground/10 h-2 w-1/3 rounded-full" />
          </div>
        </div>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={cn(
          'w-full rounded-[2rem] transition-opacity duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
          !loaded && 'absolute inset-0 h-full'
        )}
      />
    </div>
  )
}
