'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Camera, MapPin, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const LocationPickerMap = dynamic(
  () => import('./location-picker-map').then((mod) => mod.LocationPickerMap),
  { ssr: false }
)

type LocationState =
  | { status: 'loading' }
  | { status: 'success'; lat: number; lng: number }
  | { status: 'error' }

export function PhotoScreen({
  onNext,
}: {
  onNext: (data: { photoUrl: string; lat: number; lng: number }) => void
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [location, setLocation] = useState<LocationState>({ status: 'loading' })
  const [showMap, setShowMap] = useState(false)

  function fetchLocation() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          status: 'success',
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      () => setLocation({ status: 'error' }),
      { enableHighAccuracy: true }
    )
  }

  function retryLocation() {
    setLocation({ status: 'loading' })
    fetchLocation()
  }

  useEffect(() => {
    fetchLocation()
  }, [])

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setPhotoPreview(URL.createObjectURL(file))
    setPhotoUrl(null)
    setUploading(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Session expired. Please sign in again.')
      setUploading(false)
      router.push('/login')
      return
    }

    const path = `${user.id}/${crypto.randomUUID()}-${file.name}`
    const { error } = await supabase.storage.from('cat-photos').upload(path, file)

    if (error) {
      toast.error(error.message)
      setUploading(false)
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('cat-photos').getPublicUrl(path)

    setPhotoUrl(publicUrl)
    setUploading(false)
  }

  function clearPhoto() {
    setPhotoPreview(null)
    setPhotoUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleContinue() {
    if (!photoUrl || location.status !== 'success') return
    onNext({ photoUrl, lat: location.lat, lng: location.lng })
  }

  const canContinue = !!photoUrl && !uploading && location.status === 'success'

  return (
    <div className="mx-auto max-w-sm px-4 py-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Catch a cat</h1>
        <p className="text-muted-foreground mt-1 text-sm">Snap a photo to get started</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
          />
          {photoPreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Selected cat"
                className="border-border h-56 w-full rounded-lg border object-cover"
              />
              {uploading && (
                <div className="bg-background/60 absolute inset-0 flex items-center justify-center rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="absolute top-2 right-2"
                onClick={clearPhoto}
                aria-label="Remove photo"
              >
                <X />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border-border text-muted-foreground hover:text-foreground hover:border-primary flex h-56 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed transition-colors"
            >
              <Camera className="h-8 w-8" />
              <span className="text-sm">Take or choose a photo</span>
            </button>
          )}
        </div>

        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          {location.status === 'loading' && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Getting your location…</span>
            </>
          )}
          {location.status === 'success' && (
            <>
              <MapPin className="text-primary h-4 w-4" />
              <span>Location captured</span>
            </>
          )}
          {location.status === 'error' && (
            <>
              <MapPin className="text-destructive h-4 w-4" />
              <span>Location unavailable — </span>
              <button
                type="button"
                onClick={retryLocation}
                className="text-primary underline underline-offset-4"
              >
                retry
              </button>
            </>
          )}
        </div>

        {location.status === 'success' && !showMap && (
          <button
            type="button"
            onClick={() => setShowMap(true)}
            className="text-primary text-sm underline underline-offset-4"
          >
            Not your location? Adjust on map
          </button>
        )}

        {showMap && location.status === 'success' && (
          <LocationPickerMap
            initialLat={location.lat}
            initialLng={location.lng}
            onChange={(lat, lng) => setLocation({ status: 'success', lat, lng })}
          />
        )}

        <Button type="button" className="w-full" disabled={!canContinue} onClick={handleContinue}>
          {uploading ? 'Uploading…' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
