'use client'

import { useState } from 'react'
import { Loader2, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/toast'
import { shareCardImage } from '@/lib/share-image'

export function CatchCardShareButton({
  cardUrl,
  downloadFilename,
  shareTitle,
  shareText,
  sharePath,
}: {
  cardUrl: string
  downloadFilename: string
  shareTitle: string
  shareText: string
  sharePath: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleShare() {
    setLoading(true)
    try {
      await shareCardImage({
        cardUrl,
        downloadFilename,
        shareTitle,
        shareText,
        shareUrl: `${window.location.origin}${sharePath}`,
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled — no-op
      } else {
        notify.error('share-failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      className="w-full rounded-xl py-6 text-base font-semibold"
      disabled={loading}
      onClick={handleShare}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing card…
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          Share this catch
        </span>
      )}
    </Button>
  )
}
