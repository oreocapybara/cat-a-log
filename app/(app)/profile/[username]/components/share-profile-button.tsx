'use client'

import { useEffect, useRef, useState } from 'react'
import { Image, Link2, Loader2, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function ShareProfileButton({ username }: { username: string }) {
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
    const cardUrl = `/api/profile-card/${username}`
    const profileUrl = `${window.location.origin}/profile/${username}`

    try {
      const res = await fetch(cardUrl)
      if (!res.ok) throw new Error('Failed to generate card')
      const blob = await res.blob()
      const file = new File([blob], `${username}-cat-a-log.png`, { type: 'image/png' })

      // Try native share with image (mobile)
      // Note: when sharing files, url must be omitted — most browsers reject
      // or silently fail when both files and url are present in the same share call.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `@${username} on Cat-A-Log`,
          text: `Check out @${username} on Cat-A-Log 🐾\n${profileUrl}`,
        })
      } else {
        // Desktop fallback: download the image
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${username}-cat-a-log.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Card downloaded!')
      }
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
        onClick={() => setOpen((prev) => !prev)}
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
