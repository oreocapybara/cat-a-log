'use client'

import Link from 'next/link'
import { Star } from 'lucide-react'
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
      className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-backwards group ring-primary/40 relative block w-full overflow-hidden rounded-2xl ring-2 motion-safe:delay-200 motion-safe:duration-300"
    >
      {/* Hero photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cat.primary_photo_url}
        alt={cat.name ?? 'Featured cat'}
        className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      {/* Featured badge — top-left */}
      <div className="bg-primary absolute top-3 left-3 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 shadow-md">
        <Star className="fill-primary-foreground text-primary-foreground h-3 w-3" />
        <span className="text-primary-foreground text-[11px] font-bold tracking-wide uppercase">
          Featured
        </span>
      </div>

      {/* Gradient overlay — stronger for reliable contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

      {/* Content overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        {/* Tier badge */}
        <span
          className="mb-2 inline-flex items-center rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase backdrop-blur-sm"
          style={{ color: tier.color }}
        >
          {tier.name}
        </span>

        {/* Cat name */}
        <p
          className={cn(
            'text-xl font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]',
            tier.glow && 'drop-shadow-[0_0_20px_rgba(254,243,199,0.6)]'
          )}
        >
          {cat.name ?? <span className="italic">Unknown Cat</span>}
        </p>

        {/* Sighting count */}
        <p
          className="mt-0.5 text-sm font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
          style={{ color: tier.color }}
        >
          Spotted {cat.timesSpotted}×
        </p>
      </div>
    </Link>
  )
}
