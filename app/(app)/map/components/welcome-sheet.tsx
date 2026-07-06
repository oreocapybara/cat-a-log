'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useSeenFlag } from '@/lib/use-seen-flag'

export function WelcomeSheet() {
  const [hasSeenWelcome, markSeen] = useSeenFlag('hasSeenWelcome')

  // Non-modal: any tap anywhere on the page (a pin, the Tag FAB, search,
  // filter icon, locate button) counts as "understood" just as much as
  // tapping "Got it" — this sheet must never be the one thing standing
  // between a first-time user and the real app.
  useEffect(() => {
    if (hasSeenWelcome) return
    document.addEventListener('pointerdown', markSeen, { capture: true })
    return () => document.removeEventListener('pointerdown', markSeen, { capture: true })
  }, [hasSeenWelcome, markSeen])

  if (hasSeenWelcome) return null

  return (
    <div className="bg-card/95 fixed inset-x-4 bottom-24 z-40 rounded-2xl border border-white/40 p-4 text-center shadow-lg backdrop-blur-md dark:border-white/10">
      <p className="font-heading text-base font-bold">🐱 Cat-A-Log</p>
      <p className="text-muted-foreground mt-1 text-sm">
        Spot a stray? Tag it. See who&apos;s nearby on the map.
      </p>
      <Button type="button" className="mt-3 w-full" onClick={markSeen}>
        Got it
      </Button>
    </div>
  )
}
