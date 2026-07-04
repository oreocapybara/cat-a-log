'use client'

import Link from 'next/link'
import { getSightingTier } from '@/lib/sighting-tiers'
import { cn } from '@/lib/utils'

type FeaturedCatCardProps = {
  cat: {
    id: string
    name: string | null
    primary_photo_url: string
    timesSpotted: number
  }
}

export function FeaturedCatCard({ cat }: FeaturedCatCardProps) {
  const tier = getSightingTier(cat.timesSpotted)

  return (
    <Link
      href={`/map?cat=${cat.id}`}
      className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-backwards group relative block w-full overflow-hidden rounded-2xl motion-safe:delay-200 motion-safe:duration-300"
    >
      {/* Hero photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cat.primary_photo_url}
        alt={cat.name ?? 'Featured cat'}
        className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Content overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        {/* Tier badge */}
        <span
          className="mb-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase"
          style={{
            backgroundColor: `${tier.color}26`,
            color: tier.color,
          }}
        >
          {tier.name}
        </span>

        {/* Cat name */}
        <p
          className={cn(
            'text-xl font-bold text-white',
            tier.glow && 'drop-shadow-[0_0_20px_rgba(254,243,199,0.6)]'
          )}
        >
          {cat.name ?? <span className="italic">Unknown Cat</span>}
        </p>

        {/* Sighting count */}
        <p className="mt-0.5 text-sm font-medium" style={{ color: tier.color }}>
          Spotted {cat.timesSpotted}×
        </p>
      </div>
    </Link>
  )
}
