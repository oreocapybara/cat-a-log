'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CatchCardShareButton } from '@/app/components/catch-card-share-button'

export default function TagCompletePage() {
  const router = useRouter()
  const [catId, setCatId] = useState<string | null>(null)
  const [name, setName] = useState('your cat')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('catId')
    if (!id) {
      router.replace('/map')
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration guard: query params only exist client-side
    setCatId(id)
    setName(params.get('name') ?? 'your cat')
    setReady(true)
  }, [router])

  if (!ready || !catId) return null

  const cardUrl = `/api/catch-card?catId=${catId}`

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-4 py-8 text-center">
      <h1 className="font-heading text-2xl font-bold tracking-tight">You found {name}!</h1>
      <p className="text-muted-foreground mt-1 text-sm">Added to the registry. Show it off.</p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cardUrl}
        alt={`${name}'s catch card`}
        className="border-border motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 mt-6 w-full max-w-xs rounded-2xl border shadow-lg motion-safe:duration-500"
      />

      <div className="mt-8 w-full max-w-sm space-y-3">
        <CatchCardShareButton
          cardUrl={cardUrl}
          downloadFilename={`${name}-catch-card.png`}
          shareTitle={`I found ${name} on Cat-A-Log`}
          shareText={`I just tagged ${name} on Cat-A-Log 🐾`}
          sharePath={`/map?cat=${catId}`}
        />
        <button
          type="button"
          onClick={() => router.push(`/map?cat=${catId}`)}
          className="text-muted-foreground text-sm underline underline-offset-4"
        >
          Back to the map
        </button>
      </div>
    </div>
  )
}
