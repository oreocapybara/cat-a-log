import { notify } from '@/lib/toast'

export async function shareCardImage(options: {
  cardUrl: string
  downloadFilename: string
  shareTitle: string
  shareText: string
  shareUrl: string
}): Promise<void> {
  const { cardUrl, downloadFilename, shareTitle, shareText, shareUrl } = options

  const res = await fetch(cardUrl)
  if (!res.ok) throw new Error('Failed to generate card')
  const blob = await res.blob()
  const file = new File([blob], downloadFilename, { type: 'image/png' })

  // Note: when sharing files, url must be omitted — most browsers reject
  // or silently fail when both files and url are present in the same share call.
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: shareTitle, text: `${shareText}\n${shareUrl}` })
    return
  }

  // Desktop fallback: download the image
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = downloadFilename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  notify.success('card-downloaded')
}
