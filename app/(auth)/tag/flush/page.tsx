'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { readPendingTag, clearPendingTag } from '@/lib/pending-tag'
import { toast } from 'sonner'

export default function TagFlushPage() {
  const router = useRouter()
  const [catName, setCatName] = useState<string | null>(null)
  const hasStarted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    async function flush() {
      const pending = await readPendingTag()
      if (!pending) {
        router.replace('/map')
        return
      }
      setCatName(pending.tag.name)

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const path = `${user.id}/${crypto.randomUUID()}-photo.jpg`
      const { error: uploadError } = await supabase.storage
        .from('cat-photos')
        .upload(path, pending.photo)

      if (uploadError) {
        await clearPendingTag()
        toast.error(uploadError.message)
        router.replace('/map')
        return
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('cat-photos').getPublicUrl(path)

      const response = await fetch('/api/catch-cat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pending.tag, photoUrl: publicUrl }),
      })

      if (!response.ok) {
        await clearPendingTag()
        const body = await response.json().catch(() => ({ error: 'Something went wrong' }))
        toast.error(body.error ?? 'Something went wrong')
        router.replace('/map')
        return
      }

      const { catId } = (await response.json()) as { catId: string }
      await clearPendingTag()
      router.replace(`/tag/complete?catId=${catId}&name=${encodeURIComponent(pending.tag.name)}`)
    }

    flush()
  }, [router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      {catName && <p className="text-muted-foreground text-sm">Saving {catName}…</p>}
    </div>
  )
}
