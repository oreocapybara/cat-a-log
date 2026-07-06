import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Clock, Eye, Images, MapPin, Scissors, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatLastSeen } from '@/lib/geo'
import { cn } from '@/lib/utils'
import { getSightingTier } from '@/lib/sighting-tiers'
import { DEFAULT_WELFARE_COLOR, getWelfareTier, TAG_META } from '@/lib/welfare-colors'
import { CatGalleryModal } from './cat-gallery-modal'
import { notify } from '@/lib/toast'
import type { CatTag, NearbyCat } from '@/lib/supabase/types'

const RESOLVE_LABEL: Record<string, string> = {
  needs_medical: 'Recovered',
  possible_rabies: 'Cleared',
}

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
  onResolveTag,
  onUndoResolveTag,
}: {
  cat: NearbyCat | null
  tags: CatTag['tag'][]
  onClose: () => void
  onViewLocation: (lat: number, lng: number) => void
  onResolveTag: (catId: string, tag: CatTag['tag']) => void
  onUndoResolveTag?: (catId: string, tag: CatTag['tag']) => void
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
  const thumbnailRef = useRef<HTMLButtonElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const nameRef = useRef<HTMLParagraphElement>(null)
  const notesRef = useRef<HTMLParagraphElement>(null)

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
      setExpanded(false)
    } else {
      setClosing(true)
    }
  }

  useEffect(() => {
    if (!closing) return
    const timeout = setTimeout(() => setRenderedCat(null), EXIT_ANIMATION_MS)
    return () => clearTimeout(timeout)
  }, [closing])

  useEffect(() => {
    function checkTruncation() {
      const nameEl = nameRef.current
      const notesEl = notesRef.current
      const nameTruncated = nameEl ? nameEl.scrollHeight > nameEl.clientHeight : false
      const notesTruncated = notesEl ? notesEl.scrollHeight > notesEl.clientHeight : false
      setIsTruncated(nameTruncated || notesTruncated)
    }

    checkTruncation()
    window.addEventListener('resize', checkTruncation)
    return () => window.removeEventListener('resize', checkTruncation)
  }, [renderedCat?.id])

  if (!renderedCat) return null

  const tier = getWelfareTier(renderedTags)
  const frameColor = tier?.color ?? DEFAULT_WELFARE_COLOR
  const sightingTier = getSightingTier(renderedCat.times_spotted)

  function handleViewLocation(lat: number, lng: number) {
    setGalleryOpen(false)
    onViewLocation(lat, lng)
  }

  // The card freezes `tags` into `renderedTags` on cat-identity change only
  // (see the effect above), so a resolve here needs its own local update —
  // otherwise the chip wouldn't disappear until the card is closed and
  // reopened, even though the parent's source-of-truth state did update.
  function handleResolve(tag: CatTag['tag']) {
    if (!renderedCat) return
    const prevTags = [...renderedTags]
    setRenderedTags((prev) => prev.filter((t) => t !== tag))

    const label = RESOLVE_LABEL[tag] ?? tag

    notify.undo('tag-resolved', {
      values: { label },
      onUndo: () => {
        setRenderedTags(prevTags)
        onUndoResolveTag?.(renderedCat.id, tag)
      },
    })

    onResolveTag(renderedCat.id, tag)
  }

  function handleCardBodyClick(e: React.MouseEvent) {
    // Don't toggle if clicking interactive children (thumbnail, close, resolve buttons)
    if ((e.target as HTMLElement).closest('button, a')) return
    if (!isTruncated) return
    setExpanded((prev) => !prev)
  }

  return (
    <div
      className={cn(
        'absolute inset-x-4 bottom-24 z-10',
        closing
          ? 'motion-safe:animate-out motion-safe:fade-out motion-safe:slide-out-to-bottom-2 motion-safe:duration-200'
          : 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200'
      )}
    >
      {/* Tier notch — tab protruding from the card's top edge */}
      {renderedCat.times_spotted > 1 && (
        <div className="relative z-10 flex justify-center">
          <span
            className="inline-flex items-center gap-1.5 rounded-t-lg px-3 py-1 text-[11px] font-bold tracking-wide uppercase shadow-md"
            style={{
              backgroundColor: sightingTier.color,
              color: sightingTier.textColor,
              boxShadow: sightingTier.glow
                ? `0 -4px 12px ${sightingTier.color}50, 0 0 20px ${sightingTier.color}30`
                : undefined,
            }}
          >
            <Eye className="h-3 w-3" />
            {sightingTier.name} · {renderedCat.times_spotted}×
          </span>
        </div>
      )}

      <Card
        className={cn(
          'bg-card/70 dark:bg-card/90 max-h-[50vh] flex-row items-start gap-3 p-3 shadow-lg ring-white/40 backdrop-blur-md duration-200 ease-out dark:ring-white/10',
          isTruncated && 'cursor-pointer'
        )}
        onClick={handleCardBodyClick}
      >
        <div className="relative shrink-0">
          <button
            ref={thumbnailRef}
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
              className={cn(
                'h-full w-full object-cover',
                tier?.desaturate && 'opacity-75 grayscale'
              )}
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
        <div className={cn('min-w-0 flex-1 text-left', expanded && 'overflow-y-auto')}>
          <p
            ref={nameRef}
            className={cn('font-heading text-base font-bold', !expanded && 'line-clamp-2')}
          >
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
                // Deceased-cascade already auto-resolves needs_medical/possible_rabies,
                // so an active deceased tag alongside them shouldn't occur — this
                // guard is defensive, matching the design doc's disabling rule.
                const resolvable =
                  (tag === 'needs_medical' || tag === 'possible_rabies') &&
                  !renderedTags.includes('deceased')

                if (!resolvable) {
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
                }

                return (
                  <button
                    key={tag}
                    type="button"
                    aria-label={tag === 'needs_medical' ? 'Mark as recovered' : 'Mark as cleared'}
                    onClick={() => handleResolve(tag)}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase transition-opacity hover:opacity-70',
                      meta.className
                    )}
                  >
                    {Icon && <Icon className="h-2.5 w-2.5" />}
                    {meta.label}
                    <Check className="h-2.5 w-2.5" />
                  </button>
                )
              })}
            </div>
          )}
          {renderedCat.notes && (
            <p
              ref={notesRef}
              className={cn(
                'text-muted-foreground border-border/60 mt-1.5 border-t pt-1.5 text-xs italic',
                !expanded && 'line-clamp-2'
              )}
            >
              &ldquo;{renderedCat.notes}&rdquo;
            </p>
          )}
          {isTruncated && !expanded && (
            <span className="text-muted-foreground mt-1 block text-right text-[11px]">…more</span>
          )}
          {expanded && (
            <div className="mt-2 flex justify-center">
              <ChevronDown className="text-muted-foreground h-4 w-4" />
            </div>
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
          originRef={thumbnailRef}
        />
      </Card>
    </div>
  )
}
