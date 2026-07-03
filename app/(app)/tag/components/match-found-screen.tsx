'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { NearbyCat, CatTag } from '@/lib/supabase/types'

const TAG_LABELS: Record<string, string> = {
  needs_medical: 'Needs medical attention',
  possible_rabies: 'Possible rabies',
  deceased: 'Deceased',
}

export function MatchFoundScreen({
  cat,
  photoUrl,
  lat,
  lng,
}: {
  cat: NearbyCat
  photoUrl: string
  lat: number
  lng: number
}) {
  const router = useRouter()
  const [tags, setTags] = useState<CatTag[]>([])
  const [saving, setSaving] = useState(true)

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

      setSaving(false)
    }

    recordSighting()
  }, [cat.id, photoUrl, lat, lng, router])

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-4 pt-10 pb-6 text-center motion-safe:duration-200">
      <span className="text-5xl">🎉</span>
      <h1 className="font-heading mt-4 text-2xl font-bold tracking-tight">
        You found {cat.name ?? 'this cat'}!
      </h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cat.primary_photo_url}
        alt={cat.name ?? 'Cat'}
        className="border-border mt-4 h-48 w-48 rounded-lg border object-cover"
      />
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {cat.is_ear_tipped && (
          <span className="bg-secondary rounded-full px-2.5 py-1 text-xs">TNR&apos;d</span>
        )}
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="bg-destructive/10 text-destructive rounded-full px-2.5 py-1 text-xs"
          >
            {TAG_LABELS[tag.tag] ?? tag.tag}
          </span>
        ))}
      </div>
      <Button
        type="button"
        className="mt-8 w-full"
        disabled={saving}
        onClick={() => router.push('/map')}
      >
        {saving ? 'Saving…' : 'Nice!'}
      </Button>
    </div>
  )
}
