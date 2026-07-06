import { notify } from '@/lib/toast'

function buildValidatedUrl(baseUrl: string): string {
  try {
    // Minimal path validation
    if (baseUrl.includes('/../') || /\/%2e%2e\//i.test(baseUrl)) {
      throw new Error('Invalid path')
    }
    
    const url = new URL(baseUrl)
    
    // Protocol + host checks
    const allowedDomains = ['example.com'] // add your allowed domains here
    if (!allowedDomains.includes(url.hostname)) {
      throw new Error('Invalid host')
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol')
    }
    
    return url.href
  } catch {
    throw new Error('Invalid URL')
  }
}

export async function shareCardImage(options: {
  cardUrl: string
  downloadFilename: string
  shareTitle: string
  shareText: string
  shareUrl: string
}): Promise<void> {
  const { cardUrl, downloadFilename, shareTitle, shareText, shareUrl } = options

  const validatedUrl = buildValidatedUrl(cardUrl)
  const res = await fetch(validatedUrl)
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
