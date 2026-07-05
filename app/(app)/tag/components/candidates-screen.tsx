'use client'

import { useEffect, useState } from 'react'
import { MapPin, Sparkles, Eye, Cat, Loader2, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

import type { NearbyCat } from '@/lib/supabase/types'

const SEARCH_RADIUS_KM = 0.5

/**
 * Hick's Law: decision time increases logarithmically with the number of
 * choices. 2 candidates + "None of these" = 3 total options — fast, low
 * cognitive load, and enough to surface a likely match.
 */
const MAX_DISPLAYED_CANDIDATES = 2

export function CandidatesScreen({
  photoFile,
  lat,
  lng,
  onBack,
  onMatch,
  onNoMatch,
}: {
  photoFile: File
  lat: number
  lng: number
  onBack: () => void
  onMatch: (cat: NearbyCat) => void
  onNoMatch: () => void
}) {
  // All nearby cats fetched from DB (used for AI re-ranking)
  const [allCandidates, setAllCandidates] = useState<NearbyCat[] | null>(null)
  // The displayed subset (max 2)
  const [displayedCandidates, setDisplayedCandidates] = useState<NearbyCat[] | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    async function loadCandidates() {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('nearby_cats', {
        user_lat: lat,
        user_lng: lng,
        radius_km: SEARCH_RADIUS_KM,
      })

      if (error) {
        toast.error('Could not check for nearby cats')
        setAllCandidates([])
        setDisplayedCandidates([])
        return
      }

      const cats = data ?? []
      setAllCandidates(cats)
      setDisplayedCandidates(cats.slice(0, MAX_DISPLAYED_CANDIDATES))
    }

    loadCandidates()
  }, [lat, lng])

  async function handleNotSure() {
    if (!allCandidates || allCandidates.length === 0) return
    setAnalyzing(true)

    const formData = new FormData()
    formData.append('image', photoFile)
    formData.append('candidateCatIds', JSON.stringify(allCandidates.map((c) => c.id)))

    const response = await fetch('/api/match', {
      method: 'POST',
      body: formData,
    })

    setAnalyzing(false)

    if (!response.ok) {
      toast.error("Couldn't analyze the photo, showing nearest cats instead")
      return
    }

    const { rankedIds } = (await response.json()) as { rankedIds: string[] }
    const ranked = rankedIds
      .map((id) => allCandidates.find((c) => c.id === id))
      .filter((c): c is NearbyCat => !!c)
    const unranked = allCandidates.filter((c) => !rankedIds.includes(c.id))

    const reordered = [...ranked, ...unranked]
    setAllCandidates(reordered)
    setDisplayedCandidates(reordered.slice(0, MAX_DISPLAYED_CANDIDATES))
  }

  // Loading state with skeleton
  if (displayedCandidates === null) {
    return (
      <div className="motion-safe:animate-in motion-safe:fade-in mx-auto max-w-sm px-4 pt-20 pb-6 motion-safe:duration-300">
        <div className="mb-6 text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
            <Loader2 className="text-primary h-6 w-6 animate-spin" />
          </div>
          <h1 className="font-heading text-xl font-bold tracking-tight">Searching nearby…</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Checking if this cat&apos;s already registered
          </p>
        </div>

        {/* Skeleton cards */}
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-card ring-foreground/5 flex items-center gap-3 rounded-xl p-3 ring-1"
            >
              <div className="bg-muted h-16 w-16 animate-pulse rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                <div className="bg-muted h-3 w-16 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Empty state — no candidates found
  if (displayedCandidates.length === 0) {
    return (
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-sm flex-col items-center justify-center px-4 pt-20 pb-6 text-center motion-safe:duration-300">
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-20 left-0 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="bg-primary/10 mb-4 flex h-20 w-20 items-center justify-center rounded-full">
          <Cat className="text-primary h-10 w-10" />
        </div>
        <h1 className="font-heading text-xl font-bold tracking-tight">A new face!</h1>
        <p className="text-muted-foreground mt-2 max-w-[260px] text-sm leading-relaxed">
          No cats spotted nearby yet. Looks like you found a new one for the registry.
        </p>
        <Button
          type="button"
          className="shadow-primary/20 mt-8 w-full rounded-xl py-6 text-base font-semibold shadow-lg"
          onClick={onNoMatch}
        >
          Register this cat
        </Button>
      </div>
    )
  }

  // Candidates found (max 2 displayed)
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 mx-auto max-w-sm px-4 pt-20 pb-6 motion-safe:duration-300">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="text-muted-foreground hover:bg-muted hover:text-foreground mb-2 -ml-1 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="mb-6 text-center">
        <h1 className="font-heading text-xl font-bold tracking-tight">Recognize anyone?</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {displayedCandidates.length === 1
            ? 'We found a cat nearby — is this the one you spotted?'
            : 'Here are the closest matches — tap if you see yours'}
        </p>
      </div>

      {/* Cat listing */}
      <div className="space-y-2.5">
        {displayedCandidates.map((cat, index) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onMatch(cat)}
            className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 group bg-card ring-foreground/5 hover:ring-primary/40 flex w-full items-center gap-3 rounded-xl p-3 text-left ring-1 transition-all hover:shadow-md active:scale-[0.98] motion-safe:duration-200"
            style={{ animationDelay: `${index * 75}ms` }}
          >
            {/* Cat photo */}
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cat.primary_photo_url}
                alt={cat.name ?? 'Unnamed cat'}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              {cat.is_ear_tipped && (
                <div className="bg-secondary text-secondary-foreground absolute top-0.5 left-0.5 rounded-sm px-1 py-0.5 text-[9px] font-bold">
                  TNR
                </div>
              )}
            </div>

            {/* Cat info */}
            <div className="min-w-0 flex-1">
              <p className="truncate leading-tight font-medium">{cat.name ?? 'Unnamed kitty'}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <MapPin className="h-3 w-3" />
                  {cat.distance_km < 0.1
                    ? `${(cat.distance_km * 1000).toFixed(0)}m`
                    : `${cat.distance_km.toFixed(1)}km`}
                </span>
                {cat.times_spotted > 1 && (
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Eye className="h-3 w-3" />
                    Seen {cat.times_spotted}×
                  </span>
                )}
              </div>
            </div>

            {/* Tap hint chevron */}
            <div className="text-muted-foreground transition-transform group-hover:translate-x-0.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-40">
                <path
                  d="M6 4L10 8L6 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-2.5">
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl py-5"
          onClick={handleNotSure}
          disabled={analyzing}
        >
          <Sparkles className="h-4 w-4" />
          {analyzing ? 'Analyzing photo…' : 'Not sure? Let AI help'}
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="w-full rounded-xl py-5"
          onClick={onNoMatch}
        >
          None of these — it&apos;s a new cat
        </Button>
      </div>
    </div>
  )
}
