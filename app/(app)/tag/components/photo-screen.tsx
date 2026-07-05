'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Camera, MapPin, Loader2, X, Aperture, ArrowLeft, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImageEditor } from './image-editor'

const LocationPickerMap = dynamic(
  () => import('./location-picker-map').then((mod) => mod.LocationPickerMap),
  { ssr: false }
)

type LocationState =
  | { status: 'loading' }
  | { status: 'success'; lat: number; lng: number }
  | { status: 'error' }

export function PhotoScreen({
  onBack,
  onNext,
}: {
  onBack: () => void
  onNext: (data: { photoUrl: string; file: File; lat: number; lng: number }) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [rawPhotoUrl, setRawPhotoUrl] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
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

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setRawPhotoUrl(url)
    setEditing(true)
  }

  function handleEditorDone(file: File) {
    // Clean up raw URL
    if (rawPhotoUrl) URL.revokeObjectURL(rawPhotoUrl)
    setRawPhotoUrl(null)
    setEditing(false)

    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
    setPhotoFile(file)
  }

  function handleEditorCancel() {
    if (rawPhotoUrl) URL.revokeObjectURL(rawPhotoUrl)
    setRawPhotoUrl(null)
    setEditing(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleReEdit() {
    if (photoFile) {
      const url = URL.createObjectURL(photoFile)
      setRawPhotoUrl(url)
      setEditing(true)
    }
  }

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    setPhotoFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleContinue() {
    if (!photoFile || !photoPreview || location.status !== 'success') return
    onNext({ photoUrl: photoPreview, file: photoFile, lat: location.lat, lng: location.lng })
  }

  const canContinue = !!photoFile && location.status === 'success'

  return (
    <>
      {/* Image Editor Overlay */}
      {editing && rawPhotoUrl && (
        <ImageEditor
          imageUrl={rawPhotoUrl}
          onDone={handleEditorDone}
          onCancel={handleEditorCancel}
        />
      )}

      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 mx-auto flex min-h-[calc(100vh-8rem)] max-w-sm flex-col px-4 pt-16 pb-6 motion-safe:duration-300">
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1 self-start text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        {/* Hero section */}
        <div className="mb-8 text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
            <Aperture className="text-primary h-8 w-8" strokeWidth={1.5} />
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Spotted a cat?</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Snap a photo and we&apos;ll check if this kitty&apos;s already in the neighborhood
            registry.
          </p>
        </div>

        {/* Photo capture */}
        <div className="flex-1 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
          />

          {photoPreview ? (
            <div className="relative overflow-hidden rounded-2xl shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Selected cat"
                className="motion-safe:animate-in motion-safe:zoom-in-95 h-64 w-full object-cover motion-safe:duration-300"
              />
              <div className="ring-primary/20 absolute inset-0 rounded-2xl ring-2 ring-inset" />
              <div className="absolute top-3 right-3 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  className="rounded-full shadow-md"
                  onClick={handleReEdit}
                  aria-label="Edit photo"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  className="rounded-full shadow-md"
                  onClick={clearPhoto}
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
                <Camera className="h-3 w-3" />
                <span>Ready</span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 relative flex h-64 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed transition-all active:scale-[0.98]"
            >
              <div className="bg-primary/15 flex h-14 w-14 items-center justify-center rounded-full transition-transform group-hover:scale-110">
                <Camera className="text-primary h-7 w-7" />
              </div>
              <div className="text-center">
                <span className="text-foreground block text-sm font-medium">
                  Take or choose a photo
                </span>
                <span className="text-muted-foreground mt-0.5 block text-xs">
                  Tap to open camera
                </span>
              </div>
            </button>
          )}

          {/* Location status */}
          <div className="bg-muted/50 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5">
            {location.status === 'loading' && (
              <>
                <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                <span className="text-muted-foreground text-sm">Pinpointing your location…</span>
              </>
            )}
            {location.status === 'success' && (
              <>
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <MapPin className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm">Location locked</span>
              </>
            )}
            {location.status === 'error' && (
              <>
                <MapPin className="text-destructive h-4 w-4" />
                <span className="text-sm">Location unavailable</span>
                <button
                  type="button"
                  onClick={retryLocation}
                  className="text-primary ml-auto text-xs font-medium"
                >
                  Retry
                </button>
              </>
            )}
          </div>

          {location.status === 'success' && !showMap && (
            <button
              type="button"
              onClick={() => setShowMap(true)}
              className="text-muted-foreground hover:text-foreground w-full text-center text-xs transition-colors"
            >
              Not quite right? <span className="text-primary font-medium">Adjust on map</span>
            </button>
          )}

          {showMap && location.status === 'success' && (
            <LocationPickerMap
              initialLat={location.lat}
              initialLng={location.lng}
              onChange={(lat, lng) => setLocation({ status: 'success', lat, lng })}
            />
          )}
        </div>

        {/* Continue button */}
        <div className="mt-6">
          <Button
            type="button"
            className="shadow-primary/20 w-full rounded-xl py-6 text-base font-semibold shadow-lg transition-all disabled:shadow-none"
            disabled={!canContinue}
            onClick={handleContinue}
          >
            Find matches
          </Button>
        </div>
      </div>
    </>
  )
}
