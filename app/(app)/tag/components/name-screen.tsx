'use client'

import { useState, useCallback } from 'react'
import { Dices, Sparkles, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { generateCatName } from '@/lib/cat-names'

export function NameScreen({
  onBack,
  onNext,
}: {
  onBack: () => void
  onNext: (name: string) => void
}) {
  const [name, setName] = useState(() => generateCatName())
  const [rolling, setRolling] = useState(false)

  const rollName = useCallback(() => {
    setRolling(true)
    setName(generateCatName())
    setTimeout(() => setRolling(false), 400)
  }, [])

  return (
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

      {/* Celebration header */}
      <div className="mb-8 text-center">
        <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
          <div className="bg-primary/10 absolute inset-0 animate-pulse rounded-full" />
          <span className="relative text-5xl">🐱</span>
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">New cat unlocked!</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Every cat deserves a name. We picked one — keep it or make it yours.
        </p>
      </div>

      {/* Name input area */}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className={cn(
                'rounded-xl py-6 text-center text-lg font-semibold transition-all',
                rolling && 'motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-200'
              )}
            />
            <Sparkles className="text-primary/40 pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2" />
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl py-5"
          onClick={rollName}
        >
          <Dices className={cn('h-4 w-4 transition-transform', rolling && 'rotate-180')} />
          Roll another name
        </Button>
      </div>

      {/* Continue */}
      <div className="mt-6">
        <Button
          type="button"
          className="shadow-primary/20 w-full rounded-xl py-6 text-base font-semibold shadow-lg transition-all disabled:shadow-none"
          disabled={!name.trim()}
          onClick={() => onNext(name.trim())}
        >
          That&apos;s the one
        </Button>
      </div>
    </div>
  )
}
