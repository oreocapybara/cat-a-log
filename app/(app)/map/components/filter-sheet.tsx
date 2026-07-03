'use client'

import { useMemo, useState } from 'react'
import { Scissors } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TAG_META } from '@/lib/welfare-colors'
import type { CatTag, NearbyCat } from '@/lib/supabase/types'

export type CatFilters = {
  earTippedOnly: boolean
  tags: CatTag['tag'][]
}

const TAG_OPTIONS = Object.entries(TAG_META) as [CatTag['tag'], (typeof TAG_META)[CatTag['tag']]][]

function matchesFilters(cat: NearbyCat, tags: CatTag['tag'][], filters: CatFilters): boolean {
  if (filters.earTippedOnly && !cat.is_ear_tipped) return false
  if (filters.tags.length > 0 && !filters.tags.some((tag) => tags.includes(tag))) return false
  return true
}

export function FilterSheet({
  open,
  onOpenChange,
  filters,
  onApply,
  cats,
  catTags,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: CatFilters
  onApply: (filters: CatFilters) => void
  cats: NearbyCat[]
  catTags: Map<string, CatTag['tag'][]>
}) {
  const [draft, setDraft] = useState<CatFilters>(filters)

  const matchCount = useMemo(
    () => cats.filter((cat) => matchesFilters(cat, catTags.get(cat.id) ?? [], draft)).length,
    [cats, catTags, draft]
  )

  const hasActiveFilters = draft.earTippedOnly || draft.tags.length > 0

  function toggleTag(tag: CatTag['tag']) {
    setDraft((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }))
  }

  function toggleEarTipped() {
    setDraft((prev) => ({ ...prev, earTippedOnly: !prev.earTippedOnly }))
  }

  function reset() {
    setDraft({ earTippedOnly: false, tags: [] })
  }

  function handleApply() {
    onApply(draft)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(filters)
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <div className="bg-border mx-auto -mt-2 mb-3 h-1 w-10 shrink-0 rounded-full" />

        <div className="flex items-center justify-between">
          <DialogTitle>Filter cats</DialogTitle>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={reset}
              className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-medium underline-offset-2 hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleEarTipped}
            aria-pressed={draft.earTippedOnly}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors',
              draft.earTippedOnly
                ? 'bg-secondary text-secondary-foreground border-transparent'
                : 'text-muted-foreground border-border hover:border-secondary-foreground/40'
            )}
          >
            <Scissors className="h-3 w-3" />
            Ear-tipped
          </button>

          {TAG_OPTIONS.map(([tag, meta]) => {
            const active = draft.tags.includes(tag)
            const Icon = meta.icon
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={active}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors',
                  active
                    ? cn(meta.className, 'border-transparent')
                    : 'text-muted-foreground border-border hover:border-current'
                )}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {meta.label}
              </button>
            )
          })}
        </div>

        <Button type="button" className="mt-6 w-full" onClick={handleApply}>
          {matchCount === 0
            ? 'Show 0 cats in this area'
            : `Show ${matchCount} cat${matchCount === 1 ? '' : 's'}`}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
