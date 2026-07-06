/**
 * Skeleton placeholder for the map — shown while geolocation is acquired and
 * while the Leaflet bundle loads via next/dynamic. Mimics the final layout
 * (search bar, filter button, locate button, attribution pill) so there's no
 * layout shift when the real map appears. Kept deliberately quiet — only the
 * background and status text pulse; individual element skeletons stay static
 * so the eye rests.
 */
export function MapSkeleton() {
  return (
    <div className="relative -mb-28 h-dvh overflow-hidden bg-neutral-100 dark:bg-neutral-900">
      {/* Simulated map surface — single soft gradient, no grid noise */}
      <div className="absolute inset-0 animate-pulse">
        <div className="h-full w-full bg-gradient-to-br from-neutral-200/50 via-neutral-100 to-neutral-200/50 dark:from-neutral-800/50 dark:via-neutral-900 dark:to-neutral-800/50" />
      </div>

      {/* Search bar + filter button placeholder (static, not pulsing) */}
      <div className="absolute inset-x-4 top-4 z-10 flex items-center gap-2">
        <div className="h-10 flex-1 rounded-full bg-white/60 shadow-sm dark:bg-neutral-800/60" />
        <div className="h-10 w-10 rounded-full bg-white/60 shadow-sm dark:bg-neutral-800/60" />
      </div>

      {/* User location dot (center of screen, static) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="block h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-400 shadow" />
      </div>

      {/* Locate button placeholder — matches LocateButton's position exactly */}
      <div className="absolute right-4 bottom-28 z-10">
        <div className="h-11 w-11 rounded-full bg-white/60 shadow-sm dark:bg-neutral-800/60" />
      </div>

      {/* Attribution pill placeholder — matches MapAttribution's position */}
      <div className="absolute right-4 bottom-[88px]">
        <div className="h-3.5 w-28 rounded-full bg-white/40 dark:bg-neutral-800/40" />
      </div>

      {/* Status — centered below the dot, readable on all phone sizes */}
      <div className="absolute inset-x-0 top-[58%] flex justify-center">
        <span className="text-muted-foreground animate-pulse text-sm font-medium">
          Finding your location…
        </span>
      </div>
    </div>
  )
}
