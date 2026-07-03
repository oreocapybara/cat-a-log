'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { CatTag } from '@/lib/supabase/types'

export type CatFilters = {
  earTippedOnly: boolean
  tags: CatTag['tag'][]
}

const TAG_OPTIONS: { value: CatTag['tag']; label: string }[] = [
  { value: 'needs_medical', label: 'Needs medical attention' },
  { value: 'possible_rabies', label: 'Possible rabies' },
  { value: 'deceased', label: 'Deceased' },
]

export function FilterSheet({
  open,
  onOpenChange,
  filters,
  onApply,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: CatFilters
  onApply: (filters: CatFilters) => void
}) {
  const [draft, setDraft] = useState<CatFilters>(filters)

  function toggleTag(tag: CatTag['tag'], checked: boolean) {
    setDraft((prev) => ({
      ...prev,
      tags: checked ? [...prev.tags, tag] : prev.tags.filter((t) => t !== tag),
    }))
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
        <DialogTitle>Filter cats</DialogTitle>

        <div className="mt-4 flex items-center gap-2">
          <Checkbox
            id="ear-tipped-filter"
            checked={draft.earTippedOnly}
            onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, earTippedOnly: checked }))}
          />
          <Label htmlFor="ear-tipped-filter" className="font-normal">
            Ear-tipped only
          </Label>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {TAG_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <Checkbox
                id={`tag-filter-${option.value}`}
                checked={draft.tags.includes(option.value)}
                onCheckedChange={(checked) => toggleTag(option.value, checked)}
              />
              <Label htmlFor={`tag-filter-${option.value}`} className="font-normal">
                {option.label}
              </Label>
            </div>
          ))}
        </div>

        <Button type="button" className="mt-6 w-full" onClick={handleApply}>
          Apply filters
        </Button>
      </DialogContent>
    </Dialog>
  )
}
