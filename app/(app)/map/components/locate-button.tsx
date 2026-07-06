'use client'

import { useEffect, useState } from 'react'
import { LocateFixed, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type LocationMode = 'idle' | 'centered' | 'following' | 'locating'

const SPINNER_DELAY_MS = 300

export function LocateButton({
  mode,
  elevated,
  onClick,
}: {
  mode: LocationMode
  /** When true, shifts the button up to sit above the cat preview card. */
  elevated: boolean
  onClick: () => void
}) {
  const [showSpinner, setShowSpinner] = useState(false)
  const [prevMode, setPrevMode] = useState(mode)

  // React's "adjust state on prop change" pattern — setState in render body
  // (not an effect) so we don't trip react-hooks/set-state-in-effect.
  if (mode !== prevMode) {
    setPrevMode(mode)
    if (mode !== 'locating') {
      setShowSpinner(false)
    }
  }

  useEffect(() => {
    if (mode !== 'locating') return
    const timeout = setTimeout(() => setShowSpinner(true), SPINNER_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [mode])

  const pulsing = mode === 'following' || mode === 'locating'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={mode === 'locating'}
      aria-label={
        mode === 'locating'
          ? 'Getting your location…'
          : mode === 'following'
            ? 'Stop tracking my location'
            : 'Go to my location'
      }
      aria-pressed={mode === 'following'}
      className={cn(
        'absolute right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border shadow-sm backdrop-blur-md transition-all duration-200',
        elevated ? 'bottom-52' : 'bottom-28',
        pulsing
          ? 'map-locate-pulse bg-primary text-primary-foreground border-transparent'
          : 'bg-card/70 dark:bg-card/90 border-white/40 dark:border-white/10'
      )}
    >
      {mode === 'locating' && showSpinner ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <LocateFixed className="h-5 w-5" />
      )}
    </button>
  )
}
