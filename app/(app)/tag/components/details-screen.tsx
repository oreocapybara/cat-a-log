'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

const MEDICAL_TAGS = [
  { value: 'needs_medical', label: 'Needs medical attention' },
  { value: 'possible_rabies', label: 'Possible rabies' },
  { value: 'deceased', label: 'Deceased' },
] as const

const detailsSchema = z.object({
  isEarTipped: z.boolean(),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
  tags: z.array(z.string()),
})

type DetailsForm = z.infer<typeof detailsSchema>

export function DetailsScreen({
  name,
  photoUrl,
  lat,
  lng,
}: {
  name: string
  photoUrl: string
  lat: number
  lng: number
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { isEarTipped: false, tags: [] },
  })

  async function onSubmit(data: DetailsForm) {
    setSubmitting(true)

    const response = await fetch('/api/catch-cat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoUrl,
        lat,
        lng,
        name,
        isEarTipped: data.isEarTipped,
        notes: data.notes || null,
        tags: data.tags,
      }),
    })

    if (!response.ok) {
      if (response.status === 401) {
        toast.error('Session expired. Please sign in again.')
        router.push('/login')
        return
      }

      const responseBody = await response.json().catch(() => ({ error: 'Something went wrong' }))
      toast.error(responseBody.error ?? 'Something went wrong')
      setSubmitting(false)
      return
    }

    toast.success(`${name} was caught! 🐱`)
    router.push('/map')
  }

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 mx-auto max-w-sm px-4 pt-10 pb-6 motion-safe:duration-200">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">A few more details</h1>
        <p className="text-muted-foreground mt-1 text-sm">About {name}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          <Label htmlFor="notes">
            Notes <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="notes"
            placeholder="Friendly, hangs out near the dumpster…"
            maxLength={500}
            {...register('notes')}
          />
          {errors.notes && <p className="text-destructive text-xs">{errors.notes.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Medical status</Label>
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <div className="space-y-2">
                {MEDICAL_TAGS.map((tag) => (
                  <div key={tag.value} className="flex items-center gap-2">
                    <Checkbox
                      id={tag.value}
                      checked={field.value.includes(tag.value)}
                      onCheckedChange={(checked) => {
                        field.onChange(
                          checked
                            ? [...field.value, tag.value]
                            : field.value.filter((v) => v !== tag.value)
                        )
                      }}
                    />
                    <Label htmlFor={tag.value} className="font-normal">
                      {tag.label}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Catching…' : 'Catch this cat!'}
        </Button>
      </form>
    </div>
  )
}
