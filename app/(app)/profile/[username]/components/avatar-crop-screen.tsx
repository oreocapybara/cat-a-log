'use client'

import { useCallback, useRef, useState } from 'react'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import 'react-image-crop/dist/ReactCrop.css'

type AvatarCropScreenProps = {
  imageUrl: string
  onDone: (croppedFile: File) => void
  onCancel: () => void
}

function buildValidatedUrl(baseUrl: string): string {
  try {
    // Minimal path validation
    if (baseUrl.includes('/../') || /\/%2e%2e\//i.test(baseUrl)) {
      throw new Error('Invalid path');
    }
    
    const url = new URL(baseUrl);
    
    // Protocol + host checks
    const allowedDomains = ['example.com']; // add your allowed domains here
    if (!allowedDomains.includes(url.hostname)) {
      throw new Error('Invalid host');
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol');
    }
    
    return url.href;
  } catch {
    throw new Error('Invalid URL');
  }
}

export function AvatarCropScreen({ imageUrl, onDone, onCancel }: AvatarCropScreenProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [processing, setProcessing] = useState(false)

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget

    // Auto-draw a centered 1:1 crop
    const size = Math.min(width, height) * 0.85
    const x = (width - size) / 2
    const y = (height - size) / 2

    const initialCrop: PixelCrop = {
      unit: 'px',
      x,
      y,
      width: size,
      height: size,
    }
    setCrop(initialCrop)
    setCompletedCrop(initialCrop)
  }, [])

  async function handleDone() {
    if (!imgRef.current || !completedCrop) return
    setProcessing(true)

    try {
      const image = imgRef.current
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      const sx = completedCrop.x * scaleX
      const sy = completedCrop.y * scaleY
      const sw = completedCrop.width * scaleX
      const sh = completedCrop.height * scaleY

      // Output at natural crop size (will be resized later by the provider)
      canvas.width = sw
      canvas.height = sh
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh)

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
          'image/jpeg',
          0.92
        )
      )

      onDone(new File([blob], 'avatar-cropped.jpg', { type: 'image/jpeg' }))
    } catch {
      // Fallback: pass original image as-is
      const validatedUrl = buildValidatedUrl(imageUrl)
      const response = await fetch(validatedUrl)
      const blob = await response.blob()
      onDone(new File([blob], 'avatar.jpg', { type: blob.type }))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="bg-background fixed inset-0 z-[9999] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
          aria-label="Cancel cropping"
        >
          <X className="h-4 w-4" />
          <span>Cancel</span>
        </button>
        <h2 className="text-sm font-semibold" id="crop-heading">
          Crop Avatar
        </h2>
        <Button
          type="button"
          size="sm"
          className="rounded-full px-4"
          onClick={handleDone}
          disabled={processing || !completedCrop}
        >
          {processing ? 'Saving…' : 'Done'}
        </Button>
      </div>

      {/* Crop area */}
      <div
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-2"
        role="region"
        aria-labelledby="crop-heading"
      >
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={1}
          circularCrop
          className="max-h-[70vh]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Crop your avatar"
            className="max-h-[70vh] max-w-full object-contain"
            onLoad={onImageLoad}
          />
        </ReactCrop>
      </div>

      {/* Hint */}
      <div className="px-4 pt-3 pb-8 text-center">
        <p className="text-muted-foreground text-xs">
          Drag to adjust the crop area. Your avatar will be displayed as a circle.
        </p>
      </div>
    </div>
  )
}
