'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { ChevronLeft, ChevronRight, MapPin, User, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { NearbyCat } from '@/lib/supabase/types'

type GalleryPhoto = {
  id: string
  photoUrl: string
  lat: number
  lng: number
  spottedAt: string
  spottedByUsername: string | null
}

// The cat's own row IS the first sighting — tagging a cat never inserts into
// `sightings` (see match-found-screen.tsx), so it has to be spliced in here
// rather than coming back from one query.
async function fetchGalleryPhotos(cat: NearbyCat): Promise<GalleryPhoto[]> {
  const supabase = createClient()

  const { data: sightings, error } = await supabase
    .from('sightings')
    .select('id, photo_url, lat, lng, created_at, spotted_by')
    .eq('cat_id', cat.id)

  if (error) throw error

  const userIds = [cat.tagged_by, ...(sightings ?? []).map((s) => s.spotted_by)].filter(
    (id): id is string => id !== null
  )

  const usernames = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', [...new Set(userIds)])
    for (const profile of profiles ?? []) usernames.set(profile.id, profile.username)
  }

  const photos: GalleryPhoto[] = [
    {
      id: cat.id,
      photoUrl: cat.primary_photo_url,
      lat: cat.lat,
      lng: cat.lng,
      spottedAt: cat.created_at,
      spottedByUsername: cat.tagged_by ? (usernames.get(cat.tagged_by) ?? null) : null,
    },
    ...(sightings ?? []).map((s) => ({
      id: s.id,
      photoUrl: s.photo_url,
      lat: s.lat,
      lng: s.lng,
      spottedAt: s.created_at,
      spottedByUsername: s.spotted_by ? (usernames.get(s.spotted_by) ?? null) : null,
    })),
  ]

  return photos.sort((a, b) => new Date(b.spottedAt).getTime() - new Date(a.spottedAt).getTime())
}

function formatSpottedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// 2-column adaptive grid rhythm:
// Hero (index 0) is always full-width. After that: pair, pair, wide, repeat.
function tileLayout(index: number, total: number): string {
  if (index === 0) {
    if (total === 1) return 'col-span-2 aspect-[3/2]'
    return 'col-span-2 aspect-[2/1]'
  }
  if (total === 2) return 'col-span-2 aspect-video'
  const pos = (index - 1) % 3
  if (pos === 2) return 'col-span-2 aspect-video'
  return 'aspect-square'
}

export function CatGalleryModal({
  cat,
  open,
  onOpenChange,
  onViewLocation,
  originRef,
}: {
  cat: NearbyCat | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewLocation: (lat: number, lng: number) => void
  originRef: React.RefObject<HTMLButtonElement | null>
}) {
  const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null)
  const [loadedCatId, setLoadedCatId] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([])
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Animation state machines
  const [phase, setPhase] = useState<'idle' | 'expanding' | 'open' | 'contracting'>('idle')
  const [originRect, setOriginRect] = useState<DOMRect | null>(null)
  const [scrolled, setScrolled] = useState(false)

  // Lightbox animation
  const [lbPhase, setLbPhase] = useState<'idle' | 'expanding' | 'open' | 'contracting'>('idle')
  const [lbOriginRect, setLbOriginRect] = useState<DOMRect | null>(null)
  const lbContainerRef = useRef<HTMLDivElement>(null)

  // Reset stale photos when cat changes
  if (cat && cat.id !== loadedCatId) {
    setLoadedCatId(cat.id)
    setPhotos(null)
  }

  // Drive gallery phase from open prop
  useEffect(() => {
    if (open && phase === 'idle') {
      const rect = originRef.current?.getBoundingClientRect() ?? null
      setOriginRect(rect)
      setPhase('expanding')
    } else if (!open && (phase === 'open' || phase === 'expanding')) {
      const rect = originRef.current?.getBoundingClientRect() ?? null
      setOriginRect(rect)
      setPhase('contracting')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Fetch photos when gallery becomes visible
  const isVisible = phase !== 'idle'
  useEffect(() => {
    if (!isVisible || !cat) return
    let cancelled = false
    fetchGalleryPhotos(cat).then((result) => {
      if (!cancelled) setPhotos(result)
    })
    return () => {
      cancelled = true
    }
  }, [isVisible, cat])

  // Scroll header blur via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), {
      threshold: 1,
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [photos])

  function handleAnimationEnd(e: React.AnimationEvent) {
    if (e.target !== popupRef.current) return
    if (phase === 'expanding') setPhase('open')
    if (phase === 'contracting') {
      setPhase('idle')
      setLightboxIndex(null)
      setLbPhase('idle')
    }
  }

  function handleLbAnimationEnd(e: React.AnimationEvent) {
    if (e.target !== lbContainerRef.current) return
    if (lbPhase === 'expanding') setLbPhase('open')
    if (lbPhase === 'contracting') {
      setLbPhase('idle')
      setLightboxIndex(null)
    }
  }

  function openLightbox(index: number) {
    const tileEl = tileRefs.current[index]
    const popupRect = popupRef.current?.getBoundingClientRect()
    if (tileEl && popupRect) {
      const tileRect = tileEl.getBoundingClientRect()
      setLbOriginRect(
        new DOMRect(
          tileRect.left - popupRect.left,
          tileRect.top - popupRect.top,
          tileRect.width,
          tileRect.height
        )
      )
    }
    setLightboxIndex(index)
    setLbPhase('expanding')
    requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo({ left: index * scrollerRef.current!.clientWidth })
    })
  }

  function closeLightbox() {
    if (lightboxIndex !== null) {
      const tileEl = tileRefs.current[lightboxIndex]
      const popupRect = popupRef.current?.getBoundingClientRect()
      if (tileEl && popupRect) {
        const tileRect = tileEl.getBoundingClientRect()
        setLbOriginRect(
          new DOMRect(
            tileRect.left - popupRect.left,
            tileRect.top - popupRect.top,
            tileRect.width,
            tileRect.height
          )
        )
      }
    }
    setLbPhase('contracting')
  }

  function handleScroll() {
    const el = scrollerRef.current
    if (!el) return
    setLightboxIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  function scrollBy(direction: -1 | 1) {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth })
  }

  const loading = isVisible && photos === null
  const activePhoto = lightboxIndex !== null && photos ? (photos[lightboxIndex] ?? null) : null

  return (
    <DialogPrimitive.Root
      open={isVisible}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false)
      }}
    >
      {isVisible && (
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop
            className={cn(
              'fixed inset-0 z-[59] bg-black/70 transition-opacity duration-300',
              phase === 'contracting' ? 'opacity-0' : 'opacity-100'
            )}
          />
          <DialogPrimitive.Popup
            ref={popupRef}
            onAnimationEnd={handleAnimationEnd}
            className={cn(
              'bg-background flex flex-col shadow-2xl',
              phase === 'expanding' && 'gallery-expanding',
              phase === 'contracting' && 'gallery-contracting',
              phase === 'open' && 'fixed inset-4 z-[60] overflow-hidden rounded-3xl'
            )}
            style={
              {
                ...(originRect && {
                  '--gallery-origin-x': `${originRect.left}px`,
                  '--gallery-origin-y': `${originRect.top}px`,
                  '--gallery-origin-w': `${originRect.width}px`,
                  '--gallery-origin-h': `${originRect.height}px`,
                }),
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
              } as React.CSSProperties
            }
          >
            {/* Header */}
            <div
              className={cn(
                'flex shrink-0 items-center justify-between px-4 pt-4 pb-2 transition-[border-color,backdrop-filter] duration-150',
                scrolled && 'border-border/60 border-b backdrop-blur-sm'
              )}
            >
              <DialogPrimitive.Title className="font-heading line-clamp-2 text-lg font-bold">
                {cat?.name ?? 'Gallery'}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Close gallery"
                className="hover:bg-muted flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </div>

            {/* Content area */}
            <div className="relative flex-1 overflow-hidden">
              {loading ? (
                <div className="grid grid-cols-2 gap-2 p-4 pt-2">
                  <div className="gallery-shimmer col-span-2 aspect-[2/1] rounded-xl" />
                  <div className="gallery-shimmer aspect-square rounded-xl" />
                  <div className="gallery-shimmer aspect-square rounded-xl" />
                </div>
              ) : photos && photos.length === 1 ? (
                <div className="flex flex-1 flex-col p-4 pt-2">
                  <button
                    type="button"
                    ref={(el) => {
                      tileRefs.current[0] = el
                    }}
                    onClick={() => openLightbox(0)}
                    className="relative overflow-hidden rounded-xl transition-[transform,filter] duration-100 ease-out active:scale-[0.98] active:brightness-[0.92]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photos[0].photoUrl}
                      alt=""
                      className="aspect-[3/2] w-full object-cover"
                    />
                  </button>
                  <p className="text-muted-foreground mt-4 text-center text-sm">
                    Only one sighting so far
                  </p>
                  <p className="text-muted-foreground mt-1 text-center text-xs">
                    {formatSpottedDate(photos[0].spottedAt)}
                    {photos[0].spottedByUsername && ` · @${photos[0].spottedByUsername}`}
                  </p>
                </div>
              ) : (
                <div data-gallery-grid className="grid grid-cols-2 gap-2 overflow-y-auto p-4 pt-2">
                  <div ref={sentinelRef} className="col-span-2 h-0" />
                  {(photos ?? []).map((photo, index) => (
                    <button
                      key={photo.id}
                      ref={(el) => {
                        tileRefs.current[index] = el
                      }}
                      type="button"
                      onClick={() => openLightbox(index)}
                      className={cn(
                        'gallery-tile-enter relative overflow-hidden rounded-xl transition-[transform,filter] duration-100 ease-out active:scale-[0.96] active:brightness-[0.92]',
                        tileLayout(index, photos!.length)
                      )}
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.photoUrl} alt="" className="h-full w-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-1.5">
                        <p className="truncate text-[10px] font-semibold text-white">
                          {formatSpottedDate(photo.spottedAt)}
                        </p>
                        {photo.spottedByUsername && (
                          <Link
                            href={`/profile/${photo.spottedByUsername}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-0.5 truncate text-[10px] text-white/80 transition-colors hover:text-white"
                          >
                            <User className="h-2.5 w-2.5 shrink-0" />@{photo.spottedByUsername}
                          </Link>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Lightbox */}
              {lbPhase !== 'idle' && lightboxIndex !== null && photos && (
                <div
                  ref={lbContainerRef}
                  onAnimationEnd={handleLbAnimationEnd}
                  className={cn(
                    'flex flex-col bg-black',
                    lbPhase === 'expanding' && 'gallery-lightbox-expanding',
                    lbPhase === 'contracting' && 'gallery-lightbox-contracting',
                    lbPhase === 'open' && 'absolute inset-0 z-10'
                  )}
                  style={
                    {
                      ...(lbOriginRect && {
                        '--lb-origin-x': `${lbOriginRect.x}px`,
                        '--lb-origin-y': `${lbOriginRect.y}px`,
                        '--lb-origin-w': `${lbOriginRect.width}px`,
                        '--lb-origin-h': `${lbOriginRect.height}px`,
                      }),
                    } as React.CSSProperties
                  }
                >
                  <div className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
                    <span className="text-sm font-medium text-white/70">
                      {lightboxIndex + 1} / {photos.length}
                    </span>
                    <button
                      type="button"
                      aria-label="Back to gallery"
                      onClick={closeLightbox}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div
                    ref={scrollerRef}
                    onScroll={handleScroll}
                    className="flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
                  >
                    {photos.map((photo) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={photo.id}
                        src={photo.photoUrl}
                        alt=""
                        className="h-full w-full shrink-0 snap-center object-contain"
                      />
                    ))}
                  </div>

                  {lightboxIndex > 0 && (
                    <button
                      type="button"
                      aria-label="Previous photo"
                      onClick={() => scrollBy(-1)}
                      className="absolute top-1/2 left-2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}
                  {lightboxIndex < photos.length - 1 && (
                    <button
                      type="button"
                      aria-label="Next photo"
                      onClick={() => scrollBy(1)}
                      className="absolute top-1/2 right-2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}

                  {activePhoto && (
                    <div className="shrink-0 px-4 pt-2 pb-4">
                      <p className="text-sm font-semibold text-white">
                        {formatSpottedDate(activePhoto.spottedAt)}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        {activePhoto.spottedByUsername ? (
                          <Link
                            href={`/profile/${activePhoto.spottedByUsername}`}
                            className="flex items-center gap-1 text-xs text-white/70 transition-colors hover:text-white"
                          >
                            <User className="h-3 w-3 shrink-0" />@{activePhoto.spottedByUsername}
                          </Link>
                        ) : (
                          <span />
                        )}
                        <button
                          type="button"
                          onClick={() => onViewLocation(activePhoto.lat, activePhoto.lng)}
                          className="flex cursor-pointer items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          View on map
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      )}
    </DialogPrimitive.Root>
  )
}
