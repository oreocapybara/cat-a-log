'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Scissors, AlertTriangle, PawPrint, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

const MEDICAL_TAGS = [
  { value: 'needs_medical', label: 'Needs medical attention', emoji: '🩺' },
  { value: 'possible_rabies', label: 'Possible rabies', emoji: '⚠️' },
  { value: 'deceased', label: 'Passed away', emoji: '🕊️' },
] as const

const detailsSchema = z.object({
  isEarTipped: z.boolean(),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
  tags: z.array(z.string()),
})

export type DetailsFormValues = z.infer<typeof detailsSchema>

export function DetailsScreen({
  name,
  onBack,
  onSave,
}: {
  name: string
  onBack: () => void
  onSave: (details: DetailsFormValues) => Promise<void>
}) {
  const [submitting, setSubmitting] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { isEarTipped: false, tags: [] },
  })

  async function onSubmit(data: DetailsFormValues) {
    setSubmitting(true)
    await onSave(data)
    setSubmitting(false)
  }

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 mx-auto max-w-sm px-4 pt-16 pb-6 motion-safe:duration-300">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </button>

      {/* Header */}
      <div className="mb-6 text-center">
        <div className="bg-primary/10 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl">
          <PawPrint className="text-primary h-6 w-6" />
        </div>
        <h1 className="font-heading text-xl font-bold tracking-tight">Almost done!</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          A few details about <span className="text-foreground font-medium">{name}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* TNR Status */}
        <Controller
          control={control}
          name="isEarTipped"
          render={({ field }) => (
            <button
              type="button"
              onClick={() => field.onChange(!field.value)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl p-4 text-left ring-1 transition-all',
                field.value
                  ? 'bg-primary/5 ring-primary/30'
                  : 'bg-card ring-foreground/5 hover:ring-foreground/10'
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                  field.value ? 'bg-primary/15' : 'bg-muted'
                )}
              >
                <Scissors
                  className={cn('h-5 w-5', field.value ? 'text-primary' : 'text-muted-foreground')}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Ear-tipped</p>
                <p className="text-muted-foreground text-xs">Already trapped, neutered, returned</p>
              </div>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                tabIndex={-1}
                aria-hidden
              />
            </button>
          )}
        />

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-medium">
            Notes
          </Label>
          <Textarea
            id="notes"
            placeholder="Friendly orange tabby, hangs out near the blue dumpster on 5th…"
            maxLength={500}
            className="min-h-[100px] rounded-xl"
            {...register('notes')}
          />
          {errors.notes && <p className="text-destructive text-xs">{errors.notes.message}</p>}
        </div>

        {/* Medical tags */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-muted-foreground h-3.5 w-3.5" />
            <Label className="text-sm font-medium">Health flags</Label>
          </div>
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <div className="divide-foreground/5 ring-foreground/5 divide-y overflow-hidden rounded-xl ring-1">
                {MEDICAL_TAGS.map((tag) => {
                  const isChecked = field.value.includes(tag.value)
                  return (
                    <button
                      key={tag.value}
                      type="button"
                      onClick={() => {
                        field.onChange(
                          isChecked
                            ? field.value.filter((v) => v !== tag.value)
                            : [...field.value, tag.value]
                        )
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                        isChecked ? 'bg-destructive/5' : 'bg-card hover:bg-muted/50'
                      )}
                    >
                      <span className="text-base">{tag.emoji}</span>
                      <span className="flex-1 text-sm">{tag.label}</span>
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          field.onChange(
                            checked
                              ? [...field.value, tag.value]
                              : field.value.filter((v) => v !== tag.value)
                          )
                        }}
                        tabIndex={-1}
                        aria-hidden
                      />
                    </button>
                  )
                })}
              </div>
            )}
          />
          <p className="text-muted-foreground text-xs">
            Only flag if you&apos;re reasonably sure — the community can verify later.
          </p>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="shadow-primary/20 w-full rounded-xl py-6 text-base font-semibold shadow-lg transition-all disabled:shadow-none"
          disabled={submitting}
        >
          {submitting ? 'Catching…' : 'Catch this cat! 🎉'}
        </Button>
      </form>
    </div>
  )
}
