'use client'

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dices, Sparkles, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { generateCatName } from '@/lib/cat-names'

const nameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(30, 'Name must be 30 characters or less'),
})

type NameForm = z.infer<typeof nameSchema>

export function NameScreen({
  onBack,
  onNext,
}: {
  onBack: () => void
  onNext: (name: string) => void
}) {
  const [rolling, setRolling] = useState(false)
  const [placeholder] = useState(() => generateCatName())

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: '' },
  })

  const nameValue = watch('name')

  const rollName = useCallback(() => {
    setRolling(true)
    setValue('name', generateCatName())
    setTimeout(() => setRolling(false), 400)
  }, [setValue])

  function onSubmit(data: NameForm) {
    onNext(data.name.trim())
  }

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 mx-auto flex min-h-[calc(100vh-8rem)] max-w-sm flex-col px-4 pt-20 pb-6 motion-safe:duration-300">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="text-muted-foreground hover:bg-muted hover:text-foreground mb-2 -ml-1 flex h-8 w-8 items-center justify-center self-start rounded-full transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Celebration header */}
      <div className="mb-8 text-center">
        <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
          <div className="bg-primary/10 absolute inset-0 animate-pulse rounded-full" />
          <span className="relative text-5xl">🐱</span>
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">New cat unlocked!</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Every cat deserves a name. Type one in or roll the dice.
        </p>
      </div>

      {/* Name input area */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="catName"
              className="text-muted-foreground text-xs font-medium tracking-wider uppercase"
            >
              Name
            </Label>
            <div className="relative">
              <Input
                id="catName"
                maxLength={30}
                placeholder={placeholder}
                className={cn(
                  'rounded-xl py-6 text-center text-lg font-semibold transition-all',
                  rolling &&
                    'motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-200'
                )}
                {...register('name')}
              />
              <Sparkles className="text-primary/40 pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2" />
            </div>
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>

          <Button
            type="button"
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/5 w-full rounded-xl py-5 font-medium"
            onClick={rollName}
          >
            <Dices className={cn('h-4 w-4 transition-transform', rolling && 'rotate-180')} />
            Roll a name
          </Button>
        </div>

        {/* Continue */}
        <div className="mt-6">
          <Button
            type="submit"
            className="shadow-primary/20 w-full rounded-xl py-6 text-base font-semibold shadow-lg transition-all disabled:shadow-none"
            disabled={!nameValue?.trim()}
          >
            That&apos;s the one
          </Button>
        </div>
      </form>
    </div>
  )
}
