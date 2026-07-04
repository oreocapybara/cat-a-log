'use client'

import { useEffect, useRef, useState } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { ChevronLeft, ChevronRight, Loader2, MapPin, User, X } from 'lucide-react'
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

// Deterministic bento rhythm: the most recent photo leads as a large hero
// tile, then a repeating cycle of two regular tiles and one wide tile so the
// grid has real visual variety instead of a uniform grid pretending to be a
// bento one.
function bentoSpanClass(index: number): string {
  if (index === 0) return 'col-span-2 row-span-2'
  return (index - 1) % 3 === 2 ? 'col-span-2' : ''
}

export function CatGalleryModal({
  cat,
  open,
  onOpenChange,
  onViewLocation,
}: {
  cat: NearbyCat | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewLocation: (lat: number, lng: number) => void
}) {
  const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null)
  const [loadedCatId, setLoadedCatId] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)

  // React's documented "adjust state when a prop changes" pattern: reset the
  // stale previous cat's photos synchronously during render (not an effect)
  // so switching cats never briefly shows the wrong cat's gallery.
  if (cat && cat.id !== loadedCatId) {
    setLoadedCatId(cat.id)
    setPhotos(null)
  }

  useEffect(() => {
    if (!open || !cat) return
    let cancelled = false
    fetchGalleryPhotos(cat).then((result) => {
      if (!cancelled) setPhotos(result)
    })
    return () => {
      cancelled = true
    }
  }, [open, cat])

  const loading = open && photos === null

  function openLightbox(index: number) {
    setLightboxIndex(index)
    requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo({ left: index * scrollerRef.current.clientWidth })
    })
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

  const activePhoto = lightboxIndex !== null && photos ? (photos[lightboxIndex] ?? null) : null

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setLightboxIndex(null)
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="motion-safe:data-[ending-style]:animate-out motion-safe:data-[ending-style]:fade-out motion-safe:data-[starting-style]:animate-in motion-safe:data-[starting-style]:fade-in fixed inset-0 z-[60] bg-black/70 motion-safe:duration-200" />
        <DialogPrimitive.Popup
          className="bg-background motion-safe:data-[ending-style]:animate-out motion-safe:data-[ending-style]:fade-out motion-safe:data-[ending-style]:zoom-out-95 motion-safe:data-[starting-style]:animate-in motion-safe:data-[starting-style]:fade-in motion-safe:data-[starting-style]:zoom-in-95 fixed inset-4 z-[60] flex flex-col overflow-hidden rounded-3xl shadow-2xl motion-safe:duration-200"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
            <DialogPrimitive.Title className="font-heading text-lg font-bold">
              {cat?.name ?? 'Gallery'}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close gallery"
              className="hover:bg-muted flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="relative flex-1 overflow-hidden">
            {loading ? (
              <div className="grid h-full place-items-center">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="grid auto-rows-[80px] grid-cols-4 gap-2 overflow-y-auto p-4 pt-2">
                {(photos ?? []).map((photo, index) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => openLightbox(index)}
                    className={cn(
                      'group relative overflow-hidden rounded-xl',
                      bentoSpanClass(index)
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.photoUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-200 group-active:scale-95"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-1.5">
                      <p className="truncate text-[10px] font-semibold text-white">
                        {formatSpottedDate(photo.spottedAt)}
                      </p>
                      {photo.spottedByUsername && (
                        <p className="flex items-center gap-0.5 truncate text-[10px] text-white/80">
                          <User className="h-2.5 w-2.5 shrink-0" />@{photo.spottedByUsername}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {lightboxIndex !== null && photos && (
            <div className="motion-safe:animate-in motion-safe:fade-in absolute inset-0 z-10 flex flex-col bg-black motion-safe:duration-150">
              <div className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
                <span className="text-sm font-medium text-white/70">
                  {lightboxIndex + 1} / {photos.length}
                </span>
                <button
                  type="button"
                  aria-label="Back to gallery"
                  onClick={() => setLightboxIndex(null)}
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
                      <p className="flex items-center gap-1 text-xs text-white/70">
                        <User className="h-3 w-3 shrink-0" />@{activePhoto.spottedByUsername}
                      </p>
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
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
