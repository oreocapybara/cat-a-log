'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock, Eye } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatLastSeen, formatRelativeTime } from '@/lib/geo'
import { TAG_META } from '@/lib/welfare-colors'
import type { CatTag } from '@/lib/supabase/types'

type MyCat = {
  id: string
  name: string | null
  primary_photo_url: string
  created_at: string
  timesSpotted: number
}

const TAG_ORDER: CatTag['tag'][] = ['needs_medical', 'possible_rabies', 'deceased']

const RESOLVE_LABEL: Record<CatTag['tag'], string> = {
  needs_medical: 'Recovered',
  possible_rabies: 'Cleared',
  deceased: '', // deceased never resolves — only hard-deleted, see the delete branch below
}

export function MyCatsList({
  cats,
  initialTags,
  currentUserId,
}: {
  cats: MyCat[]
  initialTags: CatTag[]
  currentUserId: string
}) {
  const [tagsByCat, setTagsByCat] = useState<Map<string, CatTag[]>>(() => {
    const map = new Map<string, CatTag[]>()
    for (const row of initialTags) {
      map.set(row.cat_id, [...(map.get(row.cat_id) ?? []), row])
    }
    return map
  })

  function setCatTags(catId: string, tags: CatTag[]) {
    setTagsByCat((prev) => new Map(prev).set(catId, tags))
  }

  async function handleInsertTag(catId: string, tag: CatTag['tag']) {
    const prevTags = tagsByCat.get(catId) ?? []
    const optimisticId = `optimistic-${tag}`
    setCatTags(catId, [
      ...prevTags,
      {
        id: optimisticId,
        cat_id: catId,
        tag,
        added_by: currentUserId,
        created_at: new Date().toISOString(),
        resolved_at: null,
        resolved_by: null,
      },
    ])

    const supabase = createClient()
    const { data, error } = await supabase
      .from('cat_tags')
      .insert({ cat_id: catId, tag, added_by: currentUserId })
      .select()
      .single()

    if (error || !data) {
      setCatTags(catId, prevTags)
      toast.error(error?.message ?? 'Could not add tag')
      return
    }

    setCatTags(
      catId,
      (tagsByCat.get(catId) ?? []).map((row) => (row.id === optimisticId ? data : row))
    )
  }

  async function handleResolveTag(catId: string, tag: CatTag['tag']) {
    const prevTags = tagsByCat.get(catId) ?? []
    const now = new Date().toISOString()
    setCatTags(
      catId,
      prevTags.map((row) =>
        row.tag === tag ? { ...row, resolved_at: now, resolved_by: currentUserId } : row
      )
    )

    const supabase = createClient()
    const { error } = await supabase
      .from('cat_tags')
      .update({ resolved_at: now, resolved_by: currentUserId })
      .eq('cat_id', catId)
      .eq('tag', tag)
      .is('resolved_at', null)

    if (error) {
      setCatTags(catId, prevTags)
      toast.error(error.message)
    }
  }

  async function handleDeleteTag(catId: string, tag: CatTag['tag']) {
    const prevTags = tagsByCat.get(catId) ?? []
    setCatTags(
      catId,
      prevTags.filter((row) => row.tag !== tag)
    )

    const supabase = createClient()
    const { error } = await supabase.from('cat_tags').delete().eq('cat_id', catId).eq('tag', tag)

    if (error) {
      setCatTags(catId, prevTags)
      toast.error(error.message)
    }
  }

  if (cats.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="text-muted-foreground text-sm">You haven&apos;t tagged any cats yet</p>
        <Link href="/tag" className={cn(buttonVariants(), 'w-full')}>
          Tag a cat
        </Link>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {cats.map((cat) => {
        const tags = tagsByCat.get(cat.id) ?? []
        const deceasedActive = tags.some((row) => row.tag === 'deceased' && !row.resolved_at)

        return (
          <Card key={cat.id} className="flex-row items-center gap-3 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cat.primary_photo_url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1 text-left">
              <p className="font-heading truncate text-base font-bold">
                {cat.name ?? 'Unnamed cat'}
              </p>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Spotted {cat.timesSpotted} time{cat.timesSpotted === 1 ? '' : 's'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatLastSeen(cat.created_at)}
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap gap-1">
                {TAG_ORDER.map((tag) => {
                  const row = tags.find((t) => t.tag === tag)
                  const meta = TAG_META[tag]
                  const Icon = meta.icon
                  // Once deceased is active, no point flagging new medical
                  // concern for a cat already marked dead.
                  const disabled = tag !== 'deceased' && deceasedActive

                  if (row && !row.resolved_at) {
                    const label =
                      tag === 'deceased'
                        ? `${meta.label} · ${formatRelativeTime(row.created_at)}`
                        : meta.label
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          tag === 'deceased'
                            ? handleDeleteTag(cat.id, tag)
                            : handleResolveTag(cat.id, tag)
                        }
                        className={cn(
                          'inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase transition-opacity hover:opacity-70',
                          meta.className
                        )}
                      >
                        {Icon && <Icon className="h-2.5 w-2.5" />}
                        {label}
                      </button>
                    )
                  }

                  if (row && row.resolved_at) {
                    return (
                      <span
                        key={tag}
                        className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase"
                      >
                        ✓ {RESOLVE_LABEL[tag]} {formatRelativeTime(row.resolved_at)}
                      </span>
                    )
                  }

                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleInsertTag(cat.id, tag)}
                      className={cn(
                        'text-muted-foreground border-border inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                        disabled
                          ? 'cursor-not-allowed opacity-40'
                          : 'cursor-pointer hover:border-current'
                      )}
                    >
                      {Icon && <Icon className="h-2.5 w-2.5" />}
                      {meta.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
