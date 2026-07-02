'use client'

import { useState } from 'react'
import { PhotoScreen } from './components/photo-screen'
import { CandidatesScreen } from './components/candidates-screen'
import { MatchFoundScreen } from './components/match-found-screen'
import { NameScreen } from './components/name-screen'
import { DetailsScreen } from './components/details-screen'
import type { NearbyCat } from '@/lib/supabase/types'

type Screen =
  | { type: 'photo' }
  | { type: 'candidates'; photoUrl: string; lat: number; lng: number }
  | { type: 'match-found'; cat: NearbyCat; photoUrl: string; lat: number; lng: number }
  | { type: 'name'; photoUrl: string; lat: number; lng: number }
  | { type: 'details'; photoUrl: string; lat: number; lng: number; catName: string }

export default function TagPage() {
  const [screen, setScreen] = useState<Screen>({ type: 'photo' })

  switch (screen.type) {
    case 'photo':
      return (
        <PhotoScreen
          onNext={({ photoUrl, lat, lng }) => setScreen({ type: 'candidates', photoUrl, lat, lng })}
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
            setScreen({
              type: 'details',
              photoUrl: screen.photoUrl,
              lat: screen.lat,
              lng: screen.lng,
              catName,
            })
          }
        />
      )

    case 'details':
      return (
        <DetailsScreen
          name={screen.catName}
          photoUrl={screen.photoUrl}
          lat={screen.lat}
          lng={screen.lng}
        />
      )
  }
}
