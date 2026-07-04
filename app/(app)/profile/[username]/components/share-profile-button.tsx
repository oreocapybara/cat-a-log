'use client'

import { useState } from 'react'
import { Loader2, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function ShareProfileButton({ username }: { username: string }) {
  const [loading, setLoading] = useState(false)

  async function handleShare() {
    const cardUrl = `/api/profile-card/${username}`
    const profileUrl = `${window.location.origin}/profile/${username}`

    // Try Web Share API with image file (mobile-first path)
    if (navigator.canShare) {
      setLoading(true)
      try {
        const res = await fetch(cardUrl)
        if (!res.ok) throw new Error('Failed to generate card')
        const blob = await res.blob()
        const file = new File([blob], `${username}-cat-a-log.png`, { type: 'image/png' })

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `@${username} on Cat-A-Log`,
            text: `Check out @${username} on Cat-A-Log 🐾`,
            url: profileUrl,
          })
          setLoading(false)
          return
        }
      } catch (error) {
        // User cancelled share sheet — not an error
        if (error instanceof Error && error.name === 'AbortError') {
          setLoading(false)
          return
        }
        // Fall through to copy link fallback
      } finally {
        setLoading(false)
      }
    }

    // Fallback: copy profile link to clipboard
    try {
      await navigator.clipboard.writeText(profileUrl)
      toast.success('Link copied! 🔗')
    } catch {
      // Clipboard API failed — last resort: download the image
      const a = document.createElement('a')
      a.href = cardUrl
      a.download = `${username}-cat-a-log.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast.success('Card downloaded!')
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Share profile"
      onClick={handleShare}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
    </Button>
  )
}
