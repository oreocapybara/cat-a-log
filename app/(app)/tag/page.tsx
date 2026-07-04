'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
  | { type: 'match-found'; cat: NearbyCat; photoUrl: string; lat: number; lng: number }
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
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const totalSteps = screen.type === 'match-found' ? 3 : 4

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
      toast.error('Could not save your tag. Try again.')
      return
    }

    router.push('/tag/save')
  }

  return (
    <>
      <StepDots currentStep={STEP_INDEX[screen.type]} totalSteps={totalSteps} />
      {renderScreen(screen, setScreen, setPhotoFile, handleSave)}
    </>
  )
}

function renderScreen(
  screen: Screen,
  setScreen: (screen: Screen) => void,
  setPhotoFile: (file: File) => void,
  handleSave: (name: string, lat: number, lng: number, details: DetailsFormValues) => Promise<void>
) {
  switch (screen.type) {
    case 'photo':
      return (
        <PhotoScreen
          onNext={({ photoUrl, file, lat, lng }) => {
            setPhotoFile(file)
            setScreen({ type: 'candidates', photoUrl, lat, lng })
          }}
        />
      )

    case 'candidates':
      return (
        <CandidatesScreen
          photoUrl={screen.photoUrl}
          lat={screen.lat}
          lng={screen.lng}
          onMatch={(cat) =>
            setScreen({
              type: 'match-found',
              cat,
              photoUrl: screen.photoUrl,
              lat: screen.lat,
              lng: screen.lng,
            })
          }
          onNoMatch={() =>
            setScreen({ type: 'name', photoUrl: screen.photoUrl, lat: screen.lat, lng: screen.lng })
          }
        />
      )

    case 'match-found':
      return (
        <MatchFoundScreen
          cat={screen.cat}
          photoUrl={screen.photoUrl}
          lat={screen.lat}
          lng={screen.lng}
        />
      )

    case 'name':
      return (
        <NameScreen
          onNext={(catName) =>
            setScreen({ type: 'details', lat: screen.lat, lng: screen.lng, catName })
          }
        />
      )

    case 'details':
      return (
        <DetailsScreen
          name={screen.catName}
          onSave={(details) => handleSave(screen.catName, screen.lat, screen.lng, details)}
        />
      )
  }
}
