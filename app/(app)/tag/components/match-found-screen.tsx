'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Check, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { NearbyCat, CatTag } from '@/lib/supabase/types'

const TAG_LABELS: Record<string, { label: string; emoji: string }> = {
  needs_medical: { label: 'Needs medical', emoji: '🩺' },
  possible_rabies: { label: 'Possible rabies', emoji: '⚠️' },
  deceased: { label: 'Passed away', emoji: '🕊️' },
}

export function MatchFoundScreen({
  cat,
  photoUrl,
  lat,
  lng,
  onBack,
}: {
  cat: NearbyCat
  photoUrl: string
  lat: number
  lng: number
  onBack: () => void
}) {
  const router = useRouter()
  const [tags, setTags] = useState<CatTag[]>([])
  const [saving, setSaving] = useState(true)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    async function recordSighting() {
      const supabase = createClient()

      const [{ data: tagRows }, { data: userData }] = await Promise.all([
        supabase.from('cat_tags').select('*').eq('cat_id', cat.id),
        supabase.auth.getUser(),
      ])

      setTags(tagRows ?? [])

      const user = userData.user
      if (!user) {
        toast.error('Session expired. Please sign in again.')
        router.push('/login')
        return
      }

      const { error } = await supabase.from('sightings').insert({
        cat_id: cat.id,
        photo_url: photoUrl,
        lat,
        lng,
        spotted_by: user.id,
      })

      if (error) {
        toast.error(error.message)
      }

      // Update the cat's location to the latest sighting coordinates
      const { error: updateError } = await supabase.rpc('update_cat_location', {
        p_cat_id: cat.id,
        p_lat: lat,
        p_lng: lng,
      })

      if (updateError) {
        toast.error('Could not update cat location.')
      }

      setSaving(false)
    }

    recordSighting()
  }, [cat.id, photoUrl, lat, lng, router])

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-sm flex-col items-center justify-center px-4 pt-16 pb-6 text-center motion-safe:duration-300">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground absolute top-16 left-0 flex items-center gap-1 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </button>

      {/* Celebration burst */}
      <div className="relative mb-6">
        {/* Decorative rings */}
        <div className="bg-primary/10 absolute -inset-4 animate-ping rounded-full [animation-duration:2s]" />
        <div className="bg-primary/5 absolute -inset-2 rounded-full" />

        {/* Cat photo */}
        <div className="ring-primary/30 relative h-32 w-32 overflow-hidden rounded-full ring-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cat.primary_photo_url}
            alt={cat.name ?? 'Cat'}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Success badge */}
        <div className="ring-background absolute -right-1 -bottom-1 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4">
          <Check className="h-5 w-5" strokeWidth={3} />
        </div>
      </div>

      {/* Text content with stagger */}
      <div
        className={cn(
          'transition-all duration-500',
          showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        )}
      >
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          It&apos;s {cat.name ?? 'a familiar face'}!
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Sighting recorded. Thanks for keeping tabs on the neighborhood cats.
        </p>

        {/* Stats row */}
        <div className="mt-4 flex items-center justify-center gap-4">
          {cat.times_spotted > 0 && (
            <div className="flex flex-col items-center">
              <span className="text-foreground text-lg font-bold">{cat.times_spotted + 1}</span>
              <span className="text-muted-foreground text-xs">sightings</span>
            </div>
          )}
          <div className="bg-border h-6 w-px" />
          <div className="flex flex-col items-center">
            <span className="text-foreground text-lg font-bold">
              {cat.distance_km < 0.1
                ? `${(cat.distance_km * 1000).toFixed(0)}m`
                : `${cat.distance_km.toFixed(1)}km`}
            </span>
            <span className="text-muted-foreground text-xs">away</span>
          </div>
        </div>

        {/* Status badges */}
        {(cat.is_ear_tipped || tags.length > 0) && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {cat.is_ear_tipped && (
              <span className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium">
                ✂️ TNR&apos;d
              </span>
            )}
            {tags.map((tag) => {
              const info = TAG_LABELS[tag.tag] ?? { label: tag.tag, emoji: '🏷️' }
              return (
                <span
                  key={tag.id}
                  className="bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                >
                  {info.emoji} {info.label}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="mt-8 w-full">
        <Button
          type="button"
          className="shadow-primary/20 w-full rounded-xl py-6 text-base font-semibold shadow-lg transition-all disabled:shadow-none"
          disabled={saving}
          onClick={() => router.push('/map')}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 animate-pulse" />
              Saving sighting…
            </span>
          ) : (
            'Back to the map'
          )}
        </Button>
      </div>
    </div>
  )
}
