'use client'

import { LocateFixed } from 'lucide-react'
import { cn } from '@/lib/utils'

export type LocationMode = 'idle' | 'centered' | 'following'

export function LocateButton({
  mode,
  visible,
  onClick,
}: {
  mode: LocationMode
  visible: boolean
  onClick: () => void
}) {
  if (!visible) return null

  const following = mode === 'following'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={following ? 'Stop tracking my location' : 'Go to my location'}
      aria-pressed={following}
      className={cn(
        'absolute right-4 bottom-28 z-10 flex h-11 w-11 items-center justify-center rounded-full border shadow-sm backdrop-blur-md transition-colors',
        following
          ? 'map-locate-pulse bg-primary text-primary-foreground border-transparent'
          : 'bg-card/70 dark:bg-card/90 border-white/40 dark:border-white/10'
      )}
    >
      <LocateFixed className="h-5 w-5" />
    </button>
  )
}
