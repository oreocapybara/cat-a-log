'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { notify } from '@/lib/toast'
import { PhotoScreen } from './components/photo-screen'
import { CandidatesScreen } from './components/candidates-screen'
import { MatchFoundScreen } from './components/match-found-screen'
import { NameScreen } from './components/name-screen'
import { DetailsScreen, type DetailsFormValues } from './components/details-screen'
import { StepDots } from './components/step-dots'
import { writePendingTag, type PendingTag } from '@/lib/pending-tag'
import type { NearbyCat } from '@/lib/supabase/types'

type Screen =
  | { type: 'photo' }
  | { type: 'candidates'; photoUrl: string; lat: number; lng: number }
  | { type: 'match-found'; cat: NearbyCat; lat: number; lng: number }
  | { type: 'name'; photoUrl: string; lat: number; lng: number }
  | { type: 'details'; lat: number; lng: number; catName: string }

const STEP_INDEX: Record<Screen['type'], number> = {
  photo: 1,
  candidates: 2,
  'match-found': 3,
  name: 3,
  details: 4,
}

export default function TagPage() {
  const router = useRouter()
  const [screen, setScreen] = useState<Screen>({ type: 'photo' })
  const [history, setHistory] = useState<Screen[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const totalSteps = screen.type === 'match-found' ? 3 : 4

  function goTo(next: Screen) {
    setHistory((prev) => [...prev, screen])
    setScreen(next)
  }

  function goBack() {
    if (history.length === 0) {
      router.push('/map')
      return
    }
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setScreen(prev)
  }

  async function handleSave(name: string, lat: number, lng: number, details: DetailsFormValues) {
    if (!photoFile) return

    const pendingTag: PendingTag = {
      name,
      lat,
      lng,
      isEarTipped: details.isEarTipped,
      notes: details.notes || null,
      tags: details.tags,
      version: 1,
    }

    try {
      await writePendingTag(pendingTag, photoFile)
    } catch {
      notify.error('save-tag-failed')
      return
    }

    router.push('/tag/save')
  }

  return (
    <>
      <StepDots currentStep={STEP_INDEX[screen.type]} totalSteps={totalSteps} />
      {screen.type === 'photo' && (
        <PhotoScreen
          onClose={goBack}
          onNext={({ photoUrl, file, lat, lng }) => {
            setPhotoFile(file)
            goTo({ type: 'candidates', photoUrl, lat, lng })
          }}
        />
      )}
      {screen.type === 'candidates' && photoFile && (
        <CandidatesScreen
          photoFile={photoFile}
          lat={screen.lat}
          lng={screen.lng}
          onBack={goBack}
          onMatch={(cat) =>
            goTo({
              type: 'match-found',
              cat,
              lat: screen.lat,
              lng: screen.lng,
            })
          }
          onNoMatch={() =>
            goTo({ type: 'name', photoUrl: screen.photoUrl, lat: screen.lat, lng: screen.lng })
          }
        />
      )}
      {screen.type === 'match-found' && photoFile && (
        <MatchFoundScreen
          cat={screen.cat}
          photoFile={photoFile}
          lat={screen.lat}
          lng={screen.lng}
          onBack={goBack}
        />
      )}
      {screen.type === 'name' && (
        <NameScreen
          onBack={goBack}
          onNext={(catName) => goTo({ type: 'details', lat: screen.lat, lng: screen.lng, catName })}
        />
      )}
      {screen.type === 'details' && (
        <DetailsScreen
          name={screen.catName}
          onBack={goBack}
          onSave={(details) => handleSave(screen.catName, screen.lat, screen.lng, details)}
        />
      )}
    </>
  )
}
