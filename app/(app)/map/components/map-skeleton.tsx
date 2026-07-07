/**
 * Branded skeleton placeholder for the map — shown while geolocation is
 * acquired and while the Leaflet bundle loads via next/dynamic. Mimics the
 * final layout (search bar, filter button, locate button, attribution pill)
 * so there's no layout shift when the real map appears.
 *
 * Motion design: an orchestrated sequence rather than a single pulse.
 * 1. Three small trailing paw prints fade in staggered (0.2s, 0.45s, 0.7s)
 * 2. Main paw fades in and breathes (scale + opacity cycle)
 * 3. Radial glow pulses opposite to paw scale for depth
 * 4. Status text slides up and reveals last (0.9s) — the payoff
 *
 * The UI chrome placeholders stay dead still so the center animation
 * feels purposeful, not noisy.
 */

interface MapSkeletonProps {
  /** Which loading phase we're in — drives the status text */
  phase?: 'locating' | 'map-loading'
}

const STATUS_TEXT: Record<NonNullable<MapSkeletonProps['phase']>, string> = {
  locating: 'Sniffing out your location…',
  'map-loading': 'Prowling the neighborhood…',
}

/** Reusable paw SVG path — matches the auth page paw motif */
function PawIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 80 80" fill="currentColor" className={className}>
      <ellipse cx="40" cy="48" rx="8" ry="9" />
      <ellipse cx="30" cy="34" rx="4.5" ry="5.5" />
      <ellipse cx="50" cy="34" rx="4.5" ry="5.5" />
      <ellipse cx="36" cy="28" rx="3.5" ry="4.5" />
      <ellipse cx="44" cy="28" rx="3.5" ry="4.5" />
    </svg>
  )
}

export function MapSkeleton({ phase = 'locating' }: MapSkeletonProps) {
  return (
    <div className="bg-background relative -mb-28 h-dvh overflow-hidden">
      {/* Branded gradient overlay — subtle warm tint that breathes */}
      <div className="absolute inset-0 animate-pulse">
        <div className="from-primary/5 to-primary/10 h-full w-full bg-gradient-to-br via-transparent" />
      </div>

      {/* Search bar + filter button placeholder (static) */}
      <div className="absolute inset-x-4 top-4 z-10 flex items-center gap-2">
        <div className="bg-card/60 h-10 flex-1 rounded-full shadow-sm" />
        <div className="bg-card/60 h-10 w-10 rounded-full shadow-sm" />
      </div>

      {/* ── Center motif: trailing paws → main paw → glow → text ── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Trailing paw prints — three small prints approaching from below-right */}
        <div className="relative mb-1">
          {/* Trail paw 3 (furthest, appears first) */}
          <div className="map-skeleton-trail map-skeleton-trail-1 absolute -right-8 -bottom-10 rotate-[25deg]">
            <PawIcon className="text-primary h-4 w-4" />
          </div>
          {/* Trail paw 2 */}
          <div className="map-skeleton-trail map-skeleton-trail-2 absolute -right-3 -bottom-5 rotate-[12deg]">
            <PawIcon className="text-primary h-5 w-5" />
          </div>
          {/* Trail paw 1 (closest, appears last before main) */}
          <div className="map-skeleton-trail map-skeleton-trail-3 absolute right-2 -bottom-1 rotate-[4deg]">
            <PawIcon className="text-primary h-5 w-5" />
          </div>

          {/* Radial glow — breathes opposite to paw for depth */}
          <div className="map-skeleton-glow bg-primary/20 absolute top-1/2 left-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl" />

          {/* Main paw — the hero, breathing */}
          <div className="map-skeleton-pulse relative">
            <PawIcon className="text-primary h-12 w-12" />
          </div>
        </div>

        {/* Status text — slides up after the paw sequence completes */}
        <span className="map-skeleton-status text-primary font-heading mt-3 text-sm font-medium">
          {STATUS_TEXT[phase]}
        </span>
      </div>

      {/* User location dot (center, static — provides spatial continuity) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="block h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-400 shadow" />
      </div>

      {/* Locate button placeholder */}
      <div className="absolute right-4 bottom-28 z-10">
        <div className="bg-card/60 h-11 w-11 rounded-full shadow-sm" />
      </div>

      {/* Attribution pill placeholder */}
      <div className="absolute right-4 bottom-[88px]">
        <div className="bg-card/40 h-3.5 w-28 rounded-full" />
      </div>
    </div>
  )
}
