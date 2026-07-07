'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { readPendingTag, clearPendingTag } from '@/lib/pending-tag'
import { Button } from '@/components/ui/button'
import type { PendingTag } from '@/lib/pending-tag'

type Stage = 1 | 2 | 3
type Status = 'running' | 'error' | 'done'

const STAGE_CONFIG: Record<Stage, { target: number; holdTarget: number; minMs: number }> = {
  1: { target: 60, holdTarget: 55, minMs: 1500 },
  2: { target: 90, holdTarget: 85, minMs: 1500 },
  3: { target: 100, holdTarget: 100, minMs: 1000 },
}

function stageLabel(stage: Stage, catName: string): string {
  switch (stage) {
    case 1:
      return 'Uploading photo…'
    case 2:
      return `Registering ${catName}…`
    case 3:
      return 'Got \u2019em! 🐾'
  }
}

export default function TagFlushPage() {
  const router = useRouter()
  const hasStarted = useRef(false)

  const [catName, setCatName] = useState<string>('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage>(1)
  const [status, setStatus] = useState<Status>('running')
  const [errorMessage, setErrorMessage] = useState('')
  const [progress, setProgress] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)

  // Refs to hold data across retry without re-reading IndexedDB
  const pendingRef = useRef<{ tag: PendingTag; photo: File } | null>(null)
  const publicUrlRef = useRef<string>('')

  const runSequence = useCallback(async () => {
    setStatus('running')
    setStage(1)
    setProgress(0)
    setErrorMessage('')

    const pending = pendingRef.current
    if (!pending) return

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.replace('/login')
      return
    }

    // --- Stage 1: Upload photo ---
    // Small delay to let React paint before starting the transition
    await new Promise((r) => setTimeout(r, 50))
    setProgress(STAGE_CONFIG[1].holdTarget)

    const uploadPromise = (async () => {
      const path = `${user.id}/${crypto.randomUUID()}-photo.jpg`
      const { error: uploadError } = await supabase.storage
        .from('cat-photos')
        .upload(path, pending.photo)

      if (uploadError) throw new Error(uploadError.message)

      const {
        data: { publicUrl },
      } = supabase.storage.from('cat-photos').getPublicUrl(path)
      publicUrlRef.current = publicUrl
    })()

    const timer1 = new Promise((r) => setTimeout(r, STAGE_CONFIG[1].minMs))

    try {
      await Promise.all([uploadPromise, timer1])
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed — check your connection')
      setStatus('error')
      return
    }

    setProgress(STAGE_CONFIG[1].target)

    // Brief pause to let the bar visually settle at 60%
    await new Promise((r) => setTimeout(r, 300))

    // --- Stage 2: Register cat ---
    setStage(2)
    setProgress(STAGE_CONFIG[2].holdTarget)

    const registerPromise = (async () => {
      const response = await fetch('/api/catch-cat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pending.tag, photoUrl: publicUrlRef.current }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Something went wrong' }))
        if (body.code === 'NO_PROFILE') {
          router.replace('/setup-profile?returnTo=/tag/flush')
          return null
        }
        throw new Error(body.error ?? 'Something went wrong')
      }

      return (await response.json()) as { catId: string }
    })()

    const timer2 = new Promise((r) => setTimeout(r, STAGE_CONFIG[2].minMs))

    let result: { catId: string }
    try {
      const [registerResult] = (await Promise.all([registerPromise, timer2])) as [
        { catId: string } | null,
        unknown,
      ]
      if (!registerResult) return // Redirecting to setup-profile
      result = registerResult
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
      return
    }

    setProgress(STAGE_CONFIG[2].target)
    await new Promise((r) => setTimeout(r, 300))

    // --- Stage 3: Success hold ---
    setStage(3)
    setProgress(STAGE_CONFIG[3].target)
    setStatus('done')

    await new Promise((r) => setTimeout(r, STAGE_CONFIG[3].minMs))

    // Fade out and navigate
    setFadeOut(true)
    await new Promise((r) => setTimeout(r, 300))

    await clearPendingTag()
    router.replace(
      `/tag/complete?catId=${result.catId}&name=${encodeURIComponent(pending.tag.name)}`
    )
  }, [router])

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    async function init() {
      const pending = await readPendingTag()
      if (!pending) {
        router.replace('/map')
        return
      }

      pendingRef.current = pending
      setCatName(pending.tag.name)
      setPhotoUrl(URL.createObjectURL(pending.photo))
      runSequence()
    }

    init()
  }, [router, runSequence])

  function handleRetry() {
    runSequence()
  }

  async function handleDiscard() {
    await clearPendingTag()
    router.replace('/map')
  }

  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center gap-6 px-4 transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Cat photo */}
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={catName || 'Your cat'}
          className="border-border motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 h-48 w-48 rounded-lg border object-cover shadow-md motion-safe:duration-300"
        />
      )}

      {/* Cat name */}
      {catName && <h1 className="font-heading text-xl font-bold tracking-tight">{catName}</h1>}

      {/* Stage label */}
      <p
        key={stage}
        className="text-muted-foreground motion-safe:animate-in motion-safe:fade-in h-5 text-sm motion-safe:duration-200"
      >
        {status === 'error' ? errorMessage : stageLabel(stage, catName)}
      </p>

      {/* Progress bar */}
      <div className="bg-muted h-2 w-full max-w-xs overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-[1500ms] ease-in-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Error actions */}
      {status === 'error' && (
        <div className="motion-safe:animate-in motion-safe:fade-in flex flex-col items-center gap-3 motion-safe:duration-200">
          <Button onClick={handleRetry} className="w-full max-w-xs">
            Try again
          </Button>
          <button
            type="button"
            onClick={handleDiscard}
            className="text-muted-foreground text-xs underline underline-offset-4"
          >
            Discard tag
          </button>
        </div>
      )}
    </div>
  )
}
