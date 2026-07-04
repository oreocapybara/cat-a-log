'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Clock, Eye, HandHeart, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
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
  deceased: '',
}

/** Grace period: 5 minutes after tagging, full undo (hard delete) is allowed. */
const UNDO_GRACE_MS = 5 * 60 * 1000

function isWithinGracePeriod(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < UNDO_GRACE_MS
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
  const router = useRouter()
  const [tagsByCat, setTagsByCat] = useState<Map<string, CatTag[]>>(() => {
    const map = new Map<string, CatTag[]>()
    for (const row of initialTags) {
      map.set(row.cat_id, [...(map.get(row.cat_id) ?? []), row])
    }
    return map
  })
  const [confirmTarget, setConfirmTarget] = useState<MyCat | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

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

    setTagsByCat((prev) => {
      const current = prev.get(catId) ?? []
      return new Map(prev).set(
        catId,
        current.map((row) => (row.id === optimisticId ? data : row))
      )
    })
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

  async function handleRelease(cat: MyCat) {
    setActionLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('cats').update({ tagged_by: null }).eq('id', cat.id)

    setActionLoading(false)
    setConfirmTarget(null)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(`Released ${cat.name ?? 'cat'} — it's still on the map`)
    router.refresh()
  }

  async function handleUndo(cat: MyCat) {
    setActionLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('cats').delete().eq('id', cat.id)

    setActionLoading(false)
    setConfirmTarget(null)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(`Removed ${cat.name ?? 'cat'} completely`)
    router.refresh()
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

  const canUndo = confirmTarget ? isWithinGracePeriod(confirmTarget.created_at) : false

  return (
    <>
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

              {/* Release / Undo trigger */}
              <button
                type="button"
                onClick={() => setConfirmTarget(cat)}
                aria-label={`Release ${cat.name ?? 'cat'}`}
                className="text-muted-foreground hover:text-foreground shrink-0 self-start p-1 transition-colors"
              >
                {isWithinGracePeriod(cat.created_at) ? (
                  <Trash2 className="h-4 w-4" />
                ) : (
                  <HandHeart className="h-4 w-4" />
                )}
              </button>
            </Card>
          )
        })}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent>
          {confirmTarget && (
            <div className="space-y-4">
              <DialogTitle>
                {canUndo ? 'Undo this tag?' : `Release ${confirmTarget.name ?? 'this cat'}?`}
              </DialogTitle>

              {canUndo ? (
                <p className="text-muted-foreground text-sm">
                  You tagged this cat less than 5 minutes ago. Undoing will permanently remove the
                  cat and any sightings others may have added.
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  This cat will stay on the map for the community, but it won&apos;t be linked to
                  your profile anymore.
                </p>
              )}

              <div className="flex flex-col gap-2">
                {canUndo && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={actionLoading}
                    onClick={() => handleUndo(confirmTarget)}
                  >
                    {actionLoading ? 'Removing…' : 'Remove permanently'}
                  </Button>
                )}
                <Button
                  variant={canUndo ? 'outline' : 'default'}
                  className="w-full"
                  disabled={actionLoading}
                  onClick={() => handleRelease(confirmTarget)}
                >
                  {actionLoading
                    ? 'Releasing…'
                    : canUndo
                      ? 'Just release (keep on map)'
                      : 'Release'}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  disabled={actionLoading}
                  onClick={() => setConfirmTarget(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
