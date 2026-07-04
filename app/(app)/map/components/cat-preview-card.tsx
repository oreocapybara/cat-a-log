import { useEffect, useState } from 'react'
import { Clock, Eye, Images, MapPin, Scissors, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatLastSeen } from '@/lib/geo'
import { cn } from '@/lib/utils'
import { DEFAULT_WELFARE_COLOR, getWelfareTier, TAG_META } from '@/lib/welfare-colors'
import { CatGalleryModal } from './cat-gallery-modal'
import type { CatTag, NearbyCat } from '@/lib/supabase/types'

// Matches the `duration-200` used on both the enter and exit animation classes below.
const EXIT_ANIMATION_MS = 200

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m away`
  return `${km.toFixed(1)}km away`
}

export function CatPreviewCard({
  cat,
  tags,
  onClose,
  onViewLocation,
}: {
  cat: NearbyCat | null
  tags: CatTag['tag'][]
  onClose: () => void
  onViewLocation: (lat: number, lng: number) => void
}) {
  // The card is always mounted by the parent now — closing it still needs to render
  // for one more animation frame-window so the exit transition can actually play,
  // instead of being yanked out of the DOM the instant `cat` goes null. `tags` is
  // frozen alongside `cat` for the same reason: the parent resets `tags` to `[]`
  // in the same render `cat` goes null, so reading the live `tags` prop during the
  // close animation would flash the frame back to the default color just as it's
  // supposed to be playing the exit transition in the cat's actual welfare color.
  const [renderedCat, setRenderedCat] = useState(cat)
  const [renderedTags, setRenderedTags] = useState(tags)
  const [closing, setClosing] = useState(false)
  const [prevCat, setPrevCat] = useState(cat)
  const [galleryOpen, setGalleryOpen] = useState(false)

  // React's documented pattern for "adjust state when a prop changes" without an
  // effect: compare against the previous prop value during render itself, rather
  // than in a useEffect (which would cost an extra commit for what's otherwise a
  // synchronous reaction to a prop change).
  if (cat !== prevCat) {
    setPrevCat(cat)
    if (cat) {
      setRenderedCat(cat)
      setRenderedTags(tags)
      setClosing(false)
    } else {
      setClosing(true)
    }
  }

  useEffect(() => {
    if (!closing) return
    const timeout = setTimeout(() => setRenderedCat(null), EXIT_ANIMATION_MS)
    return () => clearTimeout(timeout)
  }, [closing])

  if (!renderedCat) return null

  const tier = getWelfareTier(renderedTags)
  const frameColor = tier?.color ?? DEFAULT_WELFARE_COLOR

  function handleViewLocation(lat: number, lng: number) {
    setGalleryOpen(false)
    onViewLocation(lat, lng)
  }

  return (
    <Card
      className={cn(
        'bg-card/70 dark:bg-card/50 absolute inset-x-4 bottom-24 z-10 flex-row items-center gap-3 p-3 shadow-lg ring-white/40 backdrop-blur-md duration-200 dark:ring-white/10',
        closing
          ? 'motion-safe:animate-out motion-safe:fade-out motion-safe:slide-out-to-bottom-2'
          : 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2'
      )}
    >
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setGalleryOpen(true)}
          aria-label="View photos of this cat"
          className="block h-16 w-16 cursor-pointer overflow-hidden rounded-xl"
          style={{
            border: `3px solid ${frameColor}`,
            boxShadow: `0 0 0 3px ${frameColor}26`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={renderedCat.primary_photo_url}
            alt=""
            className={cn('h-full w-full object-cover', tier?.desaturate && 'opacity-75 grayscale')}
          />
        </button>
        {tier?.glyph && (
          <div
            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold text-white dark:border-neutral-900"
            style={{ background: frameColor }}
          >
            {tier.glyph}
          </div>
        )}
        {renderedCat.times_spotted > 1 && (
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            tabIndex={-1}
            aria-hidden="true"
            className="bg-primary text-primary-foreground absolute -right-1.5 -bottom-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-2 border-white dark:border-neutral-900"
          >
            <Images className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="font-heading truncate text-base font-bold">
          {renderedCat.name ?? 'Unnamed cat'}
        </p>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <MapPin className="h-3 w-3 shrink-0" />
            {formatDistance(renderedCat.distance_km)}
          </span>
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <Clock className="h-3 w-3 shrink-0" />
            {formatLastSeen(renderedCat.created_at)}
          </span>
          {renderedCat.times_spotted > 1 && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <Eye className="h-3 w-3 shrink-0" />
              Spotted {renderedCat.times_spotted} times
            </span>
          )}
        </div>
        {(renderedCat.is_ear_tipped || renderedTags.length > 0) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {renderedCat.is_ear_tipped && (
              <span className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                <Scissors className="h-2.5 w-2.5" />
                Ear-tipped
              </span>
            )}
            {renderedTags.map((tag) => {
              const meta = TAG_META[tag]
              const Icon = meta.icon
              return (
                <span
                  key={tag}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                    meta.className
                  )}
                >
                  {Icon && <Icon className="h-2.5 w-2.5" />}
                  {meta.label}
                </span>
              )
            })}
          </div>
        )}
        {renderedCat.notes && (
          <p className="text-muted-foreground border-border/60 mt-1.5 line-clamp-2 border-t pt-1.5 text-xs italic">
            “{renderedCat.notes}”
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 self-start"
        aria-label="Close"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>

      <CatGalleryModal
        cat={renderedCat}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        onViewLocation={handleViewLocation}
      />
    </Card>
  )
}
