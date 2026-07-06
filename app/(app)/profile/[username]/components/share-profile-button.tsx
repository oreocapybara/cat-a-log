'use client'

import { useEffect, useRef, useState } from 'react'
import { Image, Link2, Loader2, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { shareCardImage } from '@/lib/share-image'

export function ShareProfileButton({
  username,
  onOpen,
}: {
  username: string
  onOpen?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleShareLink() {
    setOpen(false)
    const profileUrl = `${window.location.origin}/profile/${username}`

    try {
      await navigator.clipboard.writeText(profileUrl)
      toast.success('Link copied! 🔗')
    } catch {
      // Clipboard failed — try Web Share with just the URL
      if (navigator.share) {
        await navigator.share({
          title: `@${username} on Cat-A-Log`,
          text: `Check out @${username} on Cat-A-Log 🐾`,
          url: profileUrl,
        })
      }
    }
  }

  async function handleShareImage() {
    setOpen(false)
    setLoading(true)

    try {
      await shareCardImage({
        cardUrl: `/api/profile-card/${username}`,
        downloadFilename: `${username}-cat-a-log.png`,
        shareTitle: `@${username} on Cat-A-Log`,
        shareText: `Check out @${username} on Cat-A-Log 🐾`,
        shareUrl: `${window.location.origin}/profile/${username}`,
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled — no-op
      } else {
        toast.error('Could not share card')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Share profile"
        disabled={loading}
        onClick={() =>
          setOpen((prev) => {
            const next = !prev
            if (next) onOpen?.()
            return next
          })
        }
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
      </Button>

      {open && (
        <div className="bg-background text-foreground animate-in fade-in zoom-in-95 absolute top-full right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border shadow-lg">
          <button
            type="button"
            onClick={handleShareLink}
            className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors"
          >
            <Link2 className="h-4 w-4" />
            Copy link
          </button>
          <button
            type="button"
            onClick={handleShareImage}
            className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors"
          >
            <Image className="h-4 w-4" />
            Share as image
          </button>
        </div>
      )}
    </div>
  )
}
