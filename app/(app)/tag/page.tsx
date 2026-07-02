'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, MapPin, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

const tagSchema = z.object({
  name: z.string().max(50, 'Name must be 50 characters or less').optional(),
  isEarTipped: z.boolean(),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
})

type TagForm = z.infer<typeof tagSchema>

type LocationState =
  | { status: 'loading' }
  | { status: 'success'; lat: number; lng: number }
  | { status: 'error' }

export default function TagPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [location, setLocation] = useState<LocationState>({ status: 'loading' })
  const [submitting, setSubmitting] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TagForm>({
    resolver: zodResolver(tagSchema),
    defaultValues: { isEarTipped: false },
  })

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

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function clearPhoto() {
    setPhoto(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function onSubmit(data: TagForm) {
    if (!photo) {
      toast.error('Add a photo of the cat')
      return
    }
    if (location.status !== 'success') {
      toast.error('Location is required — enable location access and try again')
      return
    }

    setSubmitting(true)
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Session expired. Please sign in again.')
      router.push('/login')
      return
    }

    const path = `${user.id}/${crypto.randomUUID()}-${photo.name}`
    const { error: uploadError } = await supabase.storage.from('cat-photos').upload(path, photo)

    if (uploadError) {
      toast.error(uploadError.message)
      setSubmitting(false)
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('cat-photos').getPublicUrl(path)

    const { error: insertError } = await supabase.from('cats').insert({
      name: data.name || null,
      primary_photo_url: publicUrl,
      lat: location.lat,
      lng: location.lng,
      is_ear_tipped: data.isEarTipped,
      notes: data.notes || null,
      tagged_by: user.id,
    })

    if (insertError) {
      toast.error(insertError.message)
      setSubmitting(false)
      return
    }

    toast.success('Cat tagged! 🐱')
    router.push('/map')
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Tag a cat</h1>
        <p className="text-muted-foreground mt-1 text-sm">Snap a photo where you spotted it</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        <div className="space-y-1">
          <Label htmlFor="name">
            Name <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input id="name" placeholder="Whiskers" {...register('name')} />
          {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
        </div>

        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="isEarTipped"
            render={({ field }) => (
              <Checkbox id="isEarTipped" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label htmlFor="isEarTipped" className="font-normal">
            Ear-tipped (already TNR&apos;d)
          </Label>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between">
            <Label htmlFor="notes">
              Notes <span className="text-muted-foreground">(optional)</span>
            </Label>
          </div>
          <Textarea
            id="notes"
            placeholder="Friendly, hangs out near the dumpster…"
            maxLength={500}
            {...register('notes')}
          />
          {errors.notes && <p className="text-destructive text-xs">{errors.notes.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Tagging…' : 'Tag this cat'}
        </Button>
      </form>
    </div>
  )
}
