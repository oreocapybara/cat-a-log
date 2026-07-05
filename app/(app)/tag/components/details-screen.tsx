'use client'

import { useState } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Scissors,
  AlertTriangle,
  PawPrint,
  ArrowLeft,
  Check,
  Sparkles,
  Stethoscope,
  Skull,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const MEDICAL_TAGS = [
  { value: 'needs_medical', label: 'Needs medical', icon: Stethoscope, color: 'amber' },
  { value: 'possible_rabies', label: 'Possible rabies', icon: AlertTriangle, color: 'red' },
  { value: 'deceased', label: 'Passed away', icon: Skull, color: 'slate' },
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
    defaultValues: { isEarTipped: false, notes: '', tags: [] },
  })

  const notes = useWatch({ control, name: 'notes' })
  const selectedTags = useWatch({ control, name: 'tags' })
  const isEarTipped = useWatch({ control, name: 'isEarTipped' })
  const notesLength = notes?.length ?? 0

  async function onSubmit(data: DetailsFormValues) {
    setSubmitting(true)
    await onSave(data)
    setSubmitting(false)
  }

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 mx-auto max-w-sm px-4 pt-20 pb-6 motion-safe:duration-300">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="text-muted-foreground hover:bg-muted hover:text-foreground mb-2 -ml-1 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Header */}
      <div className="mb-6 text-center">
        <div className="bg-primary/10 mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl">
          <PawPrint className="text-primary h-7 w-7" />
        </div>
        <h1 className="font-heading text-xl font-bold tracking-tight">Almost done!</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          A few details about <span className="text-foreground font-semibold">{name}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* TNR Status — Toggle Card */}
        <Controller
          control={control}
          name="isEarTipped"
          render={({ field }) => (
            <button
              type="button"
              onClick={() => field.onChange(!field.value)}
              className={cn(
                'bg-card/80 group relative flex w-full items-center gap-4 rounded-2xl p-4 text-left ring-1 backdrop-blur-sm transition-all duration-200',
                field.value
                  ? 'ring-primary/40 shadow-primary/5 shadow-md'
                  : 'ring-border hover:ring-foreground/15'
              )}
            >
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                  field.value ? 'bg-primary/15 scale-105' : 'bg-muted group-hover:bg-muted/80'
                )}
              >
                <Scissors
                  className={cn(
                    'h-5 w-5 transition-colors duration-200',
                    field.value ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Ear-tipped</p>
                <p className="text-muted-foreground text-xs">
                  Trapped, neutered &amp; returned (TNR)
                </p>
              </div>
              {/* Custom toggle switch */}
              <div
                className={cn(
                  'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
                  field.value ? 'bg-primary' : 'bg-muted'
                )}
              >
                <div
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200',
                    field.value ? 'left-[22px] scale-110' : 'left-0.5'
                  )}
                />
              </div>
            </button>
          )}
        />

        {/* Notes — Glass Card */}
        <div className="bg-card/80 ring-border space-y-2 rounded-2xl p-4 ring-1 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <label htmlFor="notes" className="text-sm font-semibold">
              Notes
            </label>
            <span
              className={cn(
                'text-xs tabular-nums transition-colors',
                notesLength > 450
                  ? 'font-medium text-amber-500 dark:text-amber-400'
                  : 'text-muted-foreground'
              )}
            >
              {notesLength}/500
            </span>
          </div>
          <Textarea
            id="notes"
            placeholder="Friendly orange tabby, hangs out near the blue dumpster on 5th…"
            maxLength={500}
            className="border-border/50 bg-muted/30 focus:border-primary/50 min-h-[100px] resize-none rounded-xl border"
            {...register('notes')}
          />
          {errors.notes && <p className="text-destructive text-xs">{errors.notes.message}</p>}
        </div>

        {/* Medical tags — Pill selectors */}
        <div className="bg-card/80 ring-border space-y-3 rounded-2xl p-4 ring-1 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-muted-foreground h-3.5 w-3.5" />
            <span className="text-sm font-semibold">Health flags</span>
          </div>
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
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
                        'flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium ring-1 transition-all duration-200 active:scale-95',
                        isChecked
                          ? tag.color === 'amber'
                            ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-700/50'
                            : tag.color === 'red'
                              ? 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-700/50'
                              : 'bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-800/30 dark:text-slate-300 dark:ring-slate-600/50'
                          : 'bg-muted/50 text-muted-foreground ring-border hover:bg-muted'
                      )}
                    >
                      <tag.icon className="h-4 w-4" />
                      <span>{tag.label}</span>
                      {isChecked && <Check className="h-3 w-3" />}
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

        {/* Summary preview */}
        {(isEarTipped || selectedTags.length > 0 || (notes && notes.length > 0)) && (
          <div className="bg-primary/5 ring-primary/20 rounded-2xl p-4 ring-1">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="text-primary h-3.5 w-3.5" />
              <span className="text-xs font-semibold">Summary</span>
            </div>
            <div className="text-muted-foreground space-y-1 text-xs">
              {isEarTipped && (
                <p className="flex items-center gap-1.5">
                  <Scissors className="h-3 w-3" />
                  <span>Ear-tipped (TNR)</span>
                </p>
              )}
              {selectedTags.length > 0 && (
                <p className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  <span>
                    {selectedTags
                      .map((t) => MEDICAL_TAGS.find((mt) => mt.value === t)?.label ?? t)
                      .join(', ')}
                  </span>
                </p>
              )}
              {notes && notes.length > 0 && (
                <p className="line-clamp-2 italic">&ldquo;{notes}&rdquo;</p>
              )}
            </div>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          className="shadow-primary/20 w-full rounded-xl py-6 text-base font-semibold shadow-lg transition-all active:scale-[0.98] disabled:shadow-none"
          disabled={submitting}
        >
          {submitting ? 'Catching…' : 'Catch this cat! 🎉'}
        </Button>
      </form>
    </div>
  )
}
