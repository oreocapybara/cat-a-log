'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Clock, Eye, HandHeart, Star, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatLastSeen, formatRelativeTime } from '@/lib/geo'
import { TAG_META } from '@/lib/welfare-colors'
import type { CatTag } from '@/lib/supabase/types'
import { setFeaturedCat } from '../actions'

type MyCat = {
  id: string
  name: string | null
  primary_photo_url: string
  created_at: string
  timesSpotted: number
}

const TAG_ORDER: CatTag['tag'][] = ['needs_medical', 'possible_rabies', 'invasive_risk', 'deceased']

const RESOLVE_LABEL: Record<CatTag['tag'], string> = {
  needs_medical: 'Recovered',
  possible_rabies: 'Cleared',
  invasive_risk: '',
  deceased: '',
}

const TAG_TOAST_LABEL: Record<CatTag['tag'], string> = {
  needs_medical: 'Needs medical',
  possible_rabies: 'Possible rabies',
  invasive_risk: 'Invasive risk',
  deceased: 'Passed away',
}

/** Grace period: 5 minutes after tagging, full undo (hard delete) is allowed. */
const UNDO_GRACE_MS = 5 * 60 * 1000
const TAG_UNDO_TOAST_ID = 'tag-undo'
const TAG_UNDO_DURATION = 5000

function isWithinGracePeriod(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < UNDO_GRACE_MS
}

export function MyCatsList({
  cats,
  initialTags,
  currentUserId,
  featuredCatId,
}: {
  cats: MyCat[]
  initialTags: CatTag[]
  currentUserId: string
  featuredCatId: string | null
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
  const [optimisticFeaturedId, setOptimisticFeaturedId] = useState<string | null>(featuredCatId)
  const [deceasedConfirmCatId, setDeceasedConfirmCatId] = useState<string | null>(null)

  // Track pending insert promises so undo can await them
  const pendingInserts = useRef<Map<string, PromiseLike<unknown>>>(new Map())

  function setCatTags(catId: string, tags: CatTag[]) {
    setTagsByCat((prev) => new Map(prev).set(catId, tags))
  }

  async function handleSetFeatured(catId: string) {
    const newId = optimisticFeaturedId === catId ? null : catId
    const prevId = optimisticFeaturedId
    setOptimisticFeaturedId(newId)

    const catName = cats.find((c) => c.id === catId)?.name ?? 'cat'

    if (newId) {
      toast.success(`⭐ ${catName} is now your featured cat`, {
        action: {
          label: 'Undo',
          onClick: () => {
            setOptimisticFeaturedId(prevId)
            setFeaturedCat(prevId)
          },
        },
      })
    } else {
      toast.success('Featured cat reset — showing your top cat')
    }

    const result = await setFeaturedCat(newId)
    if (result.error) {
      setOptimisticFeaturedId(prevId)
      toast.error(result.error)
    }
  }

  async function handleInsertTag(catId: string, tag: CatTag['tag']) {
    // Deceased requires inline confirmation
    if (tag === 'deceased') {
      setDeceasedConfirmCatId(catId)
      return
    }

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
        verification_status: tag === 'invasive_risk' ? 'pending' : null,
      },
    ])

    const supabase = createClient()
    const insertKey = `${catId}-${tag}`

    const insertPromise = supabase
      .from('cat_tags')
      .insert({ cat_id: catId, tag, added_by: currentUserId })
      .select()
      .single()

    pendingInserts.current.set(insertKey, insertPromise)

    // Show undo toast
    toast(`Tagged: ${TAG_TOAST_LABEL[tag]}`, {
      id: TAG_UNDO_TOAST_ID,
      duration: TAG_UNDO_DURATION,
      action: {
        label: 'Undo',
        onClick: () => handleUndoInsert(catId, tag, prevTags, insertKey),
      },
    })

    const { data, error } = await insertPromise
    pendingInserts.current.delete(insertKey)

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

  async function handleUndoInsert(
    catId: string,
    tag: CatTag['tag'],
    prevTags: CatTag[],
    insertKey: string
  ) {
    // Wait for the insert to complete if still pending
    const pending = pendingInserts.current.get(insertKey)
    if (pending) {
      await pending
      pendingInserts.current.delete(insertKey)
    }

    // Rollback optimistic state
    setCatTags(catId, prevTags)

    // Hard delete
    const supabase = createClient()
    const { error } = await supabase.from('cat_tags').delete().eq('cat_id', catId).eq('tag', tag)

    if (error) {
      toast.error("Couldn't undo — already saved")
    }
  }

  async function handleConfirmDeceased(catId: string) {
    setDeceasedConfirmCatId(null)
    const prevTags = tagsByCat.get(catId) ?? []
    const optimisticId = `optimistic-deceased`
    setCatTags(catId, [
      ...prevTags,
      {
        id: optimisticId,
        cat_id: catId,
        tag: 'deceased',
        added_by: currentUserId,
        created_at: new Date().toISOString(),
        resolved_at: null,
        resolved_by: null,
        verification_status: null,
      },
    ])

    const supabase = createClient()
    const { data, error } = await supabase
      .from('cat_tags')
      .insert({ cat_id: catId, tag: 'deceased', added_by: currentUserId })
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
    const resolvePromise = supabase
      .from('cat_tags')
      .update({ resolved_at: now, resolved_by: currentUserId })
      .eq('cat_id', catId)
      .eq('tag', tag)
      .is('resolved_at', null)

    // Show undo toast
    toast(`✓ ${RESOLVE_LABEL[tag]}`, {
      id: TAG_UNDO_TOAST_ID,
      duration: TAG_UNDO_DURATION,
      action: {
        label: 'Undo',
        onClick: () => handleUndoResolve(catId, tag, prevTags),
      },
    })

    const { error } = await resolvePromise

    if (error) {
      setCatTags(catId, prevTags)
      toast.error(error.message)
    }
  }

  async function handleUndoResolve(catId: string, tag: CatTag['tag'], prevTags: CatTag[]) {
    // Rollback optimistic state
    setCatTags(catId, prevTags)

    // Revert the resolve in DB
    const supabase = createClient()
    const { error } = await supabase
      .from('cat_tags')
      .update({ resolved_at: null, resolved_by: null })
      .eq('cat_id', catId)
      .eq('tag', tag)

    if (error) {
      toast.error("Couldn't undo — already saved")
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
          const hasVisibleTags =
            tags.length > 0 || !deceasedActive /* always show pills for owner */

          return (
            <Card key={cat.id} size="sm" className="gap-0 py-0">
              {/* Row 1: Identity */}
              <div className="flex items-center gap-3 px-3 pt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cat.primary_photo_url}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
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
                </div>

                {/* Featured star */}
                <button
                  type="button"
                  onClick={() => handleSetFeatured(cat.id)}
                  aria-label={
                    optimisticFeaturedId === cat.id
                      ? `Remove ${cat.name ?? 'cat'} as featured`
                      : `Set ${cat.name ?? 'cat'} as featured`
                  }
                  className="text-muted-foreground hover:text-primary shrink-0 self-start p-1 transition-colors"
                >
                  <Star
                    className={cn(
                      'h-4 w-4',
                      optimisticFeaturedId === cat.id && 'fill-primary text-primary'
                    )}
                  />
                </button>

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
              </div>

              {/* Row 2: Tag pills */}
              {hasVisibleTags && (
                <div className="flex flex-wrap gap-1 px-3 pt-2 pb-3">
                  {deceasedConfirmCatId === cat.id ? (
                    /* Inline deceased confirmation */
                    <div className="bg-muted motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 motion-safe:duration-200">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">Mark as passed away?</p>
                        <p className="text-muted-foreground text-xs">
                          Grays out this cat for the community.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleConfirmDeceased(cat.id)}
                        className="bg-secondary text-secondary-foreground rounded-md px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeceasedConfirmCatId(null)}
                        className="text-muted-foreground rounded-md px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    TAG_ORDER.map((tag) => {
                      const row = tags.find((t) => t.tag === tag)
                      const meta = TAG_META[tag]
                      const Icon = meta.icon
                      const disabled = tag !== 'deceased' && deceasedActive

                      if (row && !row.resolved_at) {
                        const label =
                          tag === 'deceased'
                            ? `${meta.label} · ${formatRelativeTime(row.created_at)}`
                            : meta.label
                        const isVerifiedInvasive =
                          tag === 'invasive_risk' && row.verification_status === 'verified'
                        const isResolvable =
                          !isVerifiedInvasive && tag !== 'invasive_risk' && tag !== 'deceased'
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              tag === 'deceased'
                                ? handleDeleteTag(cat.id, tag)
                                : isResolvable
                                  ? handleResolveTag(cat.id, tag)
                                  : undefined
                            }
                            disabled={!isResolvable && tag !== 'deceased'}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase transition-opacity',
                              isResolvable || tag === 'deceased'
                                ? 'cursor-pointer hover:opacity-70'
                                : 'cursor-default',
                              meta.className
                            )}
                          >
                            {Icon && <Icon className="h-2.5 w-2.5" />}
                            {label}
                            {tag === 'invasive_risk' && row.verification_status === 'pending' && (
                              <span className="ml-0.5 text-[9px] opacity-60">⏳</span>
                            )}
                            {tag === 'invasive_risk' && row.verification_status === 'verified' && (
                              <span className="ml-0.5 text-[9px]">✓</span>
                            )}
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
                    })
                  )}
                </div>
              )}
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
