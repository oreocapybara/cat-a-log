'use client'

import { useState } from 'react'
import { Dices } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { generateCatName } from '@/lib/cat-names'

export function NameScreen({ onNext }: { onNext: (name: string) => void }) {
  const [name, setName] = useState(() => generateCatName())

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 mx-auto max-w-sm px-4 pt-10 pb-6 motion-safe:duration-200">
      <div className="mb-6 text-center">
        <span className="text-5xl">🐱</span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Gotcha!</h1>
        <p className="text-muted-foreground mt-1 text-sm">You caught a new cat</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="catName">Name</Label>
          <Input
            id="catName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setName(generateCatName())}
        >
          <Dices />
          Try another
        </Button>

        <Button
          type="button"
          className="w-full"
          disabled={!name.trim()}
          onClick={() => onNext(name.trim())}
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
