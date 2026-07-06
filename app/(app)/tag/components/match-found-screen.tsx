'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin,
  Check,
  ArrowLeft,
  ChevronDown,
  AlertTriangle,
  Sparkles,
  Loader2,
  Leaf,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CatchCardShareButton } from '@/app/components/catch-card-share-button'
import { InvasiveVoteCallout } from '@/app/(app)/components/invasive-vote-callout'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { NearbyCat, CatTag } from '@/lib/supabase/types'

const TAG_LABELS: Record<string, { label: string; emoji: string }> = {
  needs_medical: { label: 'Needs medical', emoji: '🩺' },
  possible_rabies: { label: 'Possible rabies', emoji: '⚠️' },
  deceased: { label: 'Passed away', emoji: '🕊️' },
  invasive_risk: { label: 'Invasive risk', emoji: '🌿' },
}

const MEDICAL_TAGS = [
  { value: 'needs_medical', label: 'Needs medical', emoji: '🩺', color: 'amber' },
  { value: 'possible_rabies', label: 'Possible rabies', emoji: '⚠️', color: 'red' },
  { value: 'deceased', label: 'Passed away', emoji: '🕊️', color: 'slate' },
] as const

const ECOLOGICAL_TAGS = [
  { value: 'invasive_risk', label: 'Invasive risk', emoji: '🌿', color: 'green' },
] as const

export function MatchFoundScreen({
  cat,
  photoFile,
  lat,
  lng,
  onBack,
}: {
  cat: NearbyCat
  photoFile: File
  lat: number
  lng: number
  onBack: () => void
}) {
  const router = useRouter()
  const [tags, setTags] = useState<CatTag[]>([])
  const [saving, setSaving] = useState(true)
  const [showContent, setShowContent] = useState(false)
  const [sightingId, setSightingId] = useState<string | null>(null)

  // Community editing state
  const [editExpanded, setEditExpanded] = useState(false)
  const [editNotes, setEditNotes] = useState(cat.notes ?? '')
  const [selectedNewTags, setSelectedNewTags] = useState<string[]>([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [editSaved, setEditSaved] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    async function recordSighting() {
      const supabase = createClient()

      const [{ data: tagRows }, { data: userData }] = await Promise.all([
        supabase.from('cat_tags').select('*').eq('cat_id', cat.id).is('resolved_at', null),
        supabase.auth.getUser(),
      ])

      setTags(tagRows ?? [])

      const user = userData.user
      if (!user) {
        toast.error('Session expired. Please sign in again.')
        router.push('/login')
        return
      }

      setCurrentUserId(user.id)

      const path = `${user.id}/${crypto.randomUUID()}-photo.jpg`
      const { error: uploadError } = await supabase.storage
        .from('cat-photos')
        .upload(path, photoFile)

      if (uploadError) {
        toast.error(uploadError.message)
        setSaving(false)
        return
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('cat-photos').getPublicUrl(path)

      const { data: sightingRow, error } = await supabase
        .from('sightings')
        .insert({
          cat_id: cat.id,
          photo_url: publicUrl,
          lat,
          lng,
          spotted_by: user.id,
        })
        .select('id')
        .single()

      if (error) {
        toast.error(error.message)
      } else if (sightingRow) {
        setSightingId(sightingRow.id)
      }

      // Update the cat's location to the latest sighting coordinates
      const { error: updateError } = await supabase.rpc('update_cat_location', {
        p_cat_id: cat.id,
        p_lat: lat,
        p_lng: lng,
      })

      if (updateError) {
        toast.error('Could not update cat location.')
      }

      setSaving(false)
    }

    recordSighting()
  }, [cat.id, photoFile, lat, lng, router])

  // Tags already active on this cat — don't let user add duplicates
  const activeTagValues = tags.map((t) => t.tag)
  const availableTags = MEDICAL_TAGS.filter((t) => !activeTagValues.includes(t.value))
  const availableEcoTags = ECOLOGICAL_TAGS.filter((t) => !activeTagValues.includes(t.value))

  function toggleNewTag(value: string) {
    setSelectedNewTags((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const hasEdits = editNotes !== (cat.notes ?? '') || selectedNewTags.length > 0

  async function handleSaveEdits() {
    setSavingEdit(true)
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Session expired.')
      setSavingEdit(false)
      return
    }

    // Update notes if changed
    if (editNotes !== (cat.notes ?? '')) {
      const { error } = await supabase
        .from('cats')
        .update({ notes: editNotes || null, updated_by: user.id })
        .eq('id', cat.id)

      if (error) {
        toast.error('Could not update notes.')
        setSavingEdit(false)
        return
      }
    }

    // Insert new tags
    if (selectedNewTags.length > 0) {
      const { error } = await supabase.from('cat_tags').insert(
        selectedNewTags.map((tag) => ({
          cat_id: cat.id,
          tag,
          added_by: user.id,
          ...(tag === 'invasive_risk' ? { verification_status: 'pending' as const } : {}),
        }))
      )

      if (error) {
        toast.error('Could not add tags.')
        setSavingEdit(false)
        return
      }

      // Auto-insert first confirm vote for invasive_risk
      if (selectedNewTags.includes('invasive_risk')) {
        const { data: tagRow } = await supabase
          .from('cat_tags')
          .select('id')
          .eq('cat_id', cat.id)
          .eq('tag', 'invasive_risk')
          .is('resolved_at', null)
          .single()

        if (tagRow) {
          await supabase.from('invasive_risk_votes').insert({
            cat_tag_id: tagRow.id,
            voted_by: user.id,
            vote: 'confirm',
          })
        }
      }
    }

    setSavingEdit(false)
    setEditSaved(true)
    toast.success('Info updated!')
  }

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-sm flex-col items-center px-4 pt-20 pb-6 text-center motion-safe:duration-300">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-20 left-4 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Celebration burst */}
      <div className="relative mt-8 mb-6">
        {/* Decorative rings */}
        <div className="bg-primary/10 absolute -inset-4 animate-ping rounded-full [animation-duration:2s]" />
        <div className="bg-primary/5 absolute -inset-2 rounded-full" />

        {/* Cat photo */}
        <div className="ring-primary/30 relative h-32 w-32 overflow-hidden rounded-full ring-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cat.primary_photo_url}
            alt={cat.name ?? 'Cat'}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Success badge */}
        <div className="ring-background absolute -right-1 -bottom-1 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4">
          <Check className="h-5 w-5" strokeWidth={3} />
        </div>
      </div>

      {/* Text content with stagger */}
      <div
        className={cn(
          'w-full transition-all duration-500',
          showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        )}
      >
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          It&apos;s {cat.name ?? 'a familiar face'}!
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Sighting recorded. Thanks for keeping tabs on the neighborhood cats.
        </p>

        {/* Stats row */}
        <div className="mt-4 flex items-center justify-center gap-4">
          {cat.times_spotted > 0 && (
            <div className="flex flex-col items-center">
              <span className="text-foreground text-lg font-bold">{cat.times_spotted + 1}</span>
              <span className="text-muted-foreground text-xs">sightings</span>
            </div>
          )}
          <div className="bg-border h-6 w-px" />
          <div className="flex flex-col items-center">
            <span className="text-foreground text-lg font-bold">
              {cat.distance_km < 0.1
                ? `${(cat.distance_km * 1000).toFixed(0)}m`
                : `${cat.distance_km.toFixed(1)}km`}
            </span>
            <span className="text-muted-foreground text-xs">away</span>
          </div>
        </div>

        {/* Status badges */}
        {(cat.is_ear_tipped || tags.length > 0) && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {cat.is_ear_tipped && (
              <span className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium">
                ✂️ TNR&apos;d
              </span>
            )}
            {tags.map((tag) => {
              const info = TAG_LABELS[tag.tag] ?? { label: tag.tag, emoji: '🏷️' }
              const isInvasive = tag.tag === 'invasive_risk'
              return (
                <span
                  key={tag.id}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
                    isInvasive
                      ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400'
                      : 'bg-destructive/10 text-destructive'
                  )}
                >
                  {info.emoji} {info.label}
                  {isInvasive && tag.verification_status === 'pending' && (
                    <span className="ml-0.5 opacity-60">⏳</span>
                  )}
                  {isInvasive && tag.verification_status === 'verified' && (
                    <span className="ml-0.5">✓</span>
                  )}
                </span>
              )
            })}
          </div>
        )}

        {/* Catch card */}
        {sightingId && (
          <div className="mt-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/catch-card?sightingId=${sightingId}`}
              alt={`${cat.name ?? 'This cat'}'s catch card`}
              className="border-border motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 w-full max-w-[220px] rounded-2xl border shadow-lg motion-safe:duration-500"
            />
          </div>
        )}

        {/* Community editing section — appears after sighting is saved */}
        {!saving && !editSaved && (
          <div className="mt-6 w-full text-left">
            <button
              type="button"
              onClick={() => setEditExpanded(!editExpanded)}
              className="text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-1.5 text-sm font-medium transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Add or update info</span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform duration-200',
                  editExpanded && 'rotate-180'
                )}
              />
            </button>

            {editExpanded && (
              <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 mt-4 space-y-4 motion-safe:duration-200">
                {/* Notes */}
                <div className="bg-card/80 ring-border space-y-2 rounded-2xl p-4 ring-1 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <label htmlFor="edit-notes" className="text-sm font-semibold">
                      Description
                    </label>
                    <span
                      className={cn(
                        'text-xs tabular-nums transition-colors',
                        editNotes.length > 450
                          ? 'font-medium text-amber-500 dark:text-amber-400'
                          : 'text-muted-foreground'
                      )}
                    >
                      {editNotes.length}/500
                    </span>
                  </div>
                  <Textarea
                    id="edit-notes"
                    placeholder="Friendly orange tabby, hangs out near the blue dumpster on 5th…"
                    maxLength={500}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="border-border/50 bg-muted/30 focus:border-primary/50 min-h-[80px] resize-none rounded-xl border"
                  />
                </div>

                {/* Health flags */}
                {availableTags.length > 0 && (
                  <div className="bg-card/80 ring-border space-y-3 rounded-2xl p-4 ring-1 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="text-muted-foreground h-3.5 w-3.5" />
                      <span className="text-sm font-semibold">Health flags</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((tag) => {
                        const isChecked = selectedNewTags.includes(tag.value)
                        return (
                          <button
                            key={tag.value}
                            type="button"
                            onClick={() => toggleNewTag(tag.value)}
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
                            <span className="text-base leading-none">{tag.emoji}</span>
                            <span>{tag.label}</span>
                            {isChecked && <Check className="h-3 w-3" />}
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Only flag if you&apos;re reasonably sure — the community can verify later.
                    </p>
                  </div>
                )}

                {/* Ecological flags */}
                {availableEcoTags.length > 0 && (
                  <div className="bg-card/80 ring-border space-y-3 rounded-2xl p-4 ring-1 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <Leaf className="text-muted-foreground h-3.5 w-3.5" />
                      <span className="text-sm font-semibold">Ecological flags</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableEcoTags.map((tag) => {
                        const isChecked = selectedNewTags.includes(tag.value)
                        return (
                          <button
                            key={tag.value}
                            type="button"
                            onClick={() => toggleNewTag(tag.value)}
                            className={cn(
                              'flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium ring-1 transition-all duration-200 active:scale-95',
                              isChecked
                                ? 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-950/30 dark:text-green-300 dark:ring-green-700/50'
                                : 'bg-muted/50 text-muted-foreground ring-border hover:bg-muted'
                            )}
                          >
                            <span className="text-base leading-none">{tag.emoji}</span>
                            <span>{tag.label}</span>
                            {isChecked && <Check className="h-3 w-3" />}
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Flag if this cat is hunting native wildlife or frequenting a sensitive
                      habitat.
                    </p>
                  </div>
                )}

                {/* Save edits button */}
                {hasEdits && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl py-5"
                    onClick={handleSaveEdits}
                    disabled={savingEdit}
                  >
                    {savingEdit ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </span>
                    ) : (
                      'Save changes'
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Edit saved confirmation */}
        {editSaved && (
          <div className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" />
            <span>Info updated</span>
          </div>
        )}

        {/* Invasive risk verification prompt — shown after sighting saved */}
        {!saving &&
          currentUserId &&
          (() => {
            const pendingInvasive = tags.find(
              (t) => t.tag === 'invasive_risk' && t.verification_status === 'pending'
            )
            if (!pendingInvasive) return null
            if (pendingInvasive.added_by === currentUserId) return null
            return (
              <div className="mt-4 w-full">
                <InvasiveVoteCallout
                  catTagId={pendingInvasive.id}
                  currentUserId={currentUserId}
                  verificationStatus="pending"
                />
              </div>
            )
          })()}
      </div>

      {/* CTA */}
      <div className="mt-8 w-full space-y-3">
        {sightingId && (
          <CatchCardShareButton
            cardUrl={`/api/catch-card?sightingId=${sightingId}`}
            downloadFilename={`${cat.name ?? 'cat'}-catch-card.png`}
            shareTitle={`I spotted ${cat.name ?? 'a cat'} on Cat-A-Log`}
            shareText={`I just spotted ${cat.name ?? 'a cat'} again on Cat-A-Log 🐾`}
            sharePath={`/map?cat=${cat.id}`}
          />
        )}
        <Button
          type="button"
          className="shadow-primary/20 w-full rounded-xl py-6 text-base font-semibold shadow-lg transition-all disabled:shadow-none"
          disabled={saving}
          onClick={() => router.push('/map')}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 animate-pulse" />
              Saving sighting…
            </span>
          ) : (
            'Back to the map'
          )}
        </Button>
      </div>
    </div>
  )
}
