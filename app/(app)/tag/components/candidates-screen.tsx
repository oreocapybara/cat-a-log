'use client'

import { useEffect, useState } from 'react'
import { MapPin, HelpCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import type { NearbyCat } from '@/lib/supabase/types'

const SEARCH_RADIUS_KM = 0.5

export function CandidatesScreen({
  photoUrl,
  lat,
  lng,
  onMatch,
  onNoMatch,
}: {
  photoUrl: string
  lat: number
  lng: number
  onMatch: (cat: NearbyCat) => void
  onNoMatch: () => void
}) {
  const [candidates, setCandidates] = useState<NearbyCat[] | null>(null)
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
        setCandidates([])
        return
      }

      setCandidates(data ?? [])
    }

    loadCandidates()
  }, [lat, lng])

  async function handleNotSure() {
    if (!candidates || candidates.length === 0) return
    setAnalyzing(true)

    const response = await fetch('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoUrl,
        candidateCatIds: candidates.map((c) => c.id),
      }),
    })

    setAnalyzing(false)

    if (!response.ok) {
      toast.error("Couldn't analyze the photo, showing nearby cats instead")
      return
    }

    const { rankedIds } = (await response.json()) as { rankedIds: string[] }
    const ranked = rankedIds
      .map((id) => candidates.find((c) => c.id === id))
      .filter((c): c is NearbyCat => !!c)
    const unranked = candidates.filter((c) => !rankedIds.includes(c.id))

    setCandidates([...ranked, ...unranked])
  }

  if (candidates === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Checking nearby cats…</p>
      </div>
    )
  }

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 mx-auto max-w-sm px-4 pt-10 pb-6 motion-safe:duration-200">
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Is it one of these?</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {candidates.length > 0
            ? 'Cats spotted nearby'
            : "No cats spotted nearby — this one's new"}
        </p>
      </div>

      <div className="space-y-3">
        {candidates.map((cat) => (
          <Card
            key={cat.id}
            className="hover:ring-primary flex-row items-center gap-3 p-3 transition-colors"
            onClick={() => onMatch(cat)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cat.primary_photo_url}
              alt={cat.name ?? 'Unnamed cat'}
              className="h-16 w-16 rounded-lg object-cover"
            />
            <div className="flex-1">
              <p className="font-medium">{cat.name ?? 'Unnamed'}</p>
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <MapPin className="h-3 w-3" />
                <span>{(cat.distance_km * 1000).toFixed(0)}m away</span>
              </div>
            </div>
          </Card>
        ))}

        {candidates.length > 0 && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleNotSure}
            disabled={analyzing}
          >
            <HelpCircle />
            {analyzing ? 'Analyzing…' : 'Not sure'}
          </Button>
        )}

        <Button type="button" variant="secondary" className="w-full" onClick={onNoMatch}>
          Not this cat — it&apos;s new!
        </Button>
      </div>
    </div>
  )
}
