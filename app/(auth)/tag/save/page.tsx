'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { buttonVariants } from '@/components/ui/button'
import { GoogleButton } from '@/app/components/google-button'
import { readPendingTag, clearPendingTag } from '@/lib/pending-tag'

export default function TagSavePage() {
  const router = useRouter()
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [catName, setCatName] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        router.replace('/tag/flush')
        return
      }

      const pending = await readPendingTag()
      if (!pending) {
        router.replace('/tag')
        return
      }

      setPhotoUrl(URL.createObjectURL(pending.photo))
      setCatName(pending.tag.name)
      setReady(true)
    }

    init()
  }, [router])

  async function handleDiscard() {
    await clearPendingTag()
    router.push('/map')
  }

  if (!ready) return null

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-4 text-center">
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={catName ?? 'Your cat'}
          className="border-border motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 h-48 w-48 rounded-lg border object-cover shadow-sm motion-safe:duration-300"
        />
      )}

      <h1 className="font-heading mt-6 text-2xl font-bold tracking-tight">
        You found {catName ?? 'a cat'}.
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">Sign in to save them.</p>
      <p className="text-muted-foreground mt-4 text-xs">If you leave now, they&apos;ll be lost.</p>

      <div className="mt-8 w-full max-w-sm space-y-4">
        <GoogleButton label="Continue with Google" returnTo="/tag/flush" />

        <div className="flex items-center gap-3">
          <div className="border-border h-px flex-1 border-t" />
          <span className="text-muted-foreground text-xs">or</span>
          <div className="border-border h-px flex-1 border-t" />
        </div>

        <Link
          href="/register?returnTo=/tag/flush"
          className={buttonVariants({ variant: 'outline', className: 'w-full' })}
        >
          Sign up with email
        </Link>

        <p className="text-muted-foreground text-sm">
          Already tagging cats here?{' '}
          <Link
            href="/login?returnTo=/tag/flush"
            className="text-primary underline underline-offset-4"
          >
            Log in
          </Link>
        </p>

        <button
          type="button"
          onClick={handleDiscard}
          className="text-muted-foreground text-xs underline underline-offset-4"
        >
          Not now — discard tag
        </button>
      </div>
    </div>
  )
}
