'use client'

import { useEffect, useState } from 'react'
import { Loader2, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'

// Matches the `duration-200` used on both the enter and exit animation classes below.
const EXIT_ANIMATION_MS = 200

export function SearchThisAreaPill({
  visible,
  loading,
  onSearch,
}: {
  visible: boolean
  loading: boolean
  onSearch: () => void
}) {
  const [rendered, setRendered] = useState(visible)
  const [closing, setClosing] = useState(false)
  const [prevVisible, setPrevVisible] = useState(visible)

  // React's documented "adjust state on prop change" pattern — setState directly
  // in the render body (not an effect) so this doesn't trip react-hooks/set-state-in-effect.
  if (visible !== prevVisible) {
    setPrevVisible(visible)
    if (visible) {
      setRendered(true)
      setClosing(false)
    } else {
      setClosing(true)
    }
  }

  useEffect(() => {
    if (!closing) return
    const timeout = setTimeout(() => setRendered(false), EXIT_ANIMATION_MS)
    return () => clearTimeout(timeout)
  }, [closing])

  if (!rendered) return null

  return (
    <div className="absolute inset-x-4 top-[4.75rem] z-10 flex justify-center">
      <button
        type="button"
        onClick={onSearch}
        className={cn(
          'bg-card/90 dark:bg-card/90 flex cursor-pointer items-center gap-1.5 rounded-full border border-white/40 px-3.5 py-1.5 text-xs font-medium shadow-md backdrop-blur-md transition-transform duration-200 active:scale-95 dark:border-white/10',
          closing
            ? 'motion-safe:animate-out motion-safe:fade-out motion-safe:zoom-out-95 motion-safe:slide-out-to-top-1'
            : 'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:slide-in-from-top-1'
        )}
      >
        {/* Keyed remount pops the icon in fresh whenever loading toggles, instead
            of the swap reading as an abrupt cut. */}
        <span
          key={loading ? 'loading' : 'idle'}
          className="motion-safe:animate-in motion-safe:zoom-in-50 flex h-3.5 w-3.5 shrink-0 duration-150"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCw className="h-3.5 w-3.5" />
          )}
        </span>
        Search this area
      </button>
    </div>
  )
}
