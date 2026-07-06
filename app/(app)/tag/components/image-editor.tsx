'use client'

import { useCallback, useRef, useState } from 'react'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import { RotateCcw, RotateCw, Crop as CropIcon, Square, RectangleHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import 'react-image-crop/dist/ReactCrop.css'

function buildValidatedUrl(baseUrl: string): string {
  try {
    // Minimal path validation
    if (baseUrl.includes('/../') || /\/%2e%2e\//i.test(baseUrl)) {
      throw new Error('Invalid path')
    }

    const url = new URL(baseUrl)

    // Protocol checks — allow blob: for local object URLs from file inputs
    if (!['http:', 'https:', 'blob:'].includes(url.protocol)) {
      throw new Error('Invalid protocol')
    }

    return url.href
  } catch {
    throw new Error('Invalid URL')
  }
}

type AspectMode = 'free' | '1:1' | '4:3'

const ASPECT_OPTIONS: { mode: AspectMode; label: string; icon: typeof Square }[] = [
  { mode: 'free', label: 'Free', icon: CropIcon },
  { mode: '1:1', label: '1:1', icon: Square },
  { mode: '4:3', label: '4:3', icon: RectangleHorizontal },
]

function getAspectRatio(mode: AspectMode): number | undefined {
  switch (mode) {
    case '1:1':
      return 1
    case '4:3':
      return 4 / 3
    default:
      return undefined
  }
}

async function getSimpleCroppedImage(
  image: HTMLImageElement,
  crop: PixelCrop,
  rotation: number
): Promise<File> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height

  if (rotation === 0) {
    // Simple case — just crop
    const sx = crop.x * scaleX
    const sy = crop.y * scaleY
    const sw = crop.width * scaleX
    const sh = crop.height * scaleY
    canvas.width = sw
    canvas.height = sh
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh)
  } else {
    // Rotate then crop:
    // 1. Draw rotated full image onto a temp canvas
    const radians = (rotation * Math.PI) / 180
    const sin = Math.abs(Math.sin(radians))
    const cos = Math.abs(Math.cos(radians))
    const rw = image.naturalWidth * cos + image.naturalHeight * sin
    const rh = image.naturalWidth * sin + image.naturalHeight * cos

    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')!
    tempCanvas.width = rw
    tempCanvas.height = rh
    tempCtx.translate(rw / 2, rh / 2)
    tempCtx.rotate(radians)
    tempCtx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)

    // 2. Crop from the rotated canvas
    // The CSS-rotated element still reports its original width/height,
    // so scale crop coordinates by the ratio of rotated size to display size
    const factorX = rw / image.width
    const factorY = rh / image.height

    const sx = crop.x * factorX
    const sy = crop.y * factorY
    const sw = crop.width * factorX
    const sh = crop.height * factorY

    canvas.width = sw
    canvas.height = sh
    ctx.drawImage(tempCanvas, sx, sy, sw, sh, 0, 0, sw, sh)
  }

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(new File([blob!], 'cropped-photo.jpg', { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.9
    )
  })
}

export function ImageEditor({
  imageUrl,
  onDone,
  onCancel,
}: {
  imageUrl: string
  onDone: (file: File) => void
  onCancel: () => void
}) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [rotation, setRotation] = useState(0)
  const [aspectMode, setAspectMode] = useState<AspectMode>('free')
  const [processing, setProcessing] = useState(false)

  const handleRotateLeft = useCallback(() => {
    setRotation((r) => (r - 90 + 360) % 360)
    setCrop(undefined)
    setCompletedCrop(undefined)
  }, [])

  const handleRotateRight = useCallback(() => {
    setRotation((r) => (r + 90) % 360)
    setCrop(undefined)
    setCompletedCrop(undefined)
  }, [])

  const handleAspectChange = useCallback((mode: AspectMode) => {
    setAspectMode(mode)

    const aspect = getAspectRatio(mode)
    if (!aspect || !imgRef.current) {
      // Free mode — clear the crop
      setCrop(undefined)
      setCompletedCrop(undefined)
      return
    }

    // Auto-draw a centered crop rectangle for the chosen aspect
    const { width, height } = imgRef.current
    if (!width || !height) {
      setCrop(undefined)
      setCompletedCrop(undefined)
      return
    }

    let cropWidth: number
    let cropHeight: number

    if (width / height > aspect) {
      // Image is wider than the aspect — constrain by height
      cropHeight = height * 0.8
      cropWidth = cropHeight * aspect
    } else {
      // Image is taller — constrain by width
      cropWidth = width * 0.8
      cropHeight = cropWidth / aspect
    }

    const x = (width - cropWidth) / 2
    const y = (height - cropHeight) / 2

    const newCrop: PixelCrop = {
      unit: 'px',
      x,
      y,
      width: cropWidth,
      height: cropHeight,
    }
    setCrop(newCrop)
    setCompletedCrop(newCrop)
  }, [])

  async function handleDone() {
    if (!imgRef.current) return
    setProcessing(true)

    try {
      const image = imgRef.current

      if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
        const file = await getSimpleCroppedImage(image, completedCrop, rotation)
        onDone(file)
      } else {
        // No crop selected — just apply rotation if any
        if (rotation === 0) {
          // No changes — use original
          const validatedUrl = buildValidatedUrl(imageUrl)
          const response = await fetch(validatedUrl)
          const blob = await response.blob()
          onDone(new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
        } else {
          // Apply rotation only
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!
          const radians = (rotation * Math.PI) / 180
          const sin = Math.abs(Math.sin(radians))
          const cos = Math.abs(Math.cos(radians))
          canvas.width = image.naturalWidth * cos + image.naturalHeight * sin
          canvas.height = image.naturalWidth * sin + image.naturalHeight * cos
          ctx.translate(canvas.width / 2, canvas.height / 2)
          ctx.rotate(radians)
          ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)

          const blob = await new Promise<Blob>((resolve) =>
            canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9)
          )
          onDone(new File([blob], 'rotated-photo.jpg', { type: 'image/jpeg' }))
        }
      }
    } catch {
      // Fallback: use original
      const validatedUrl = buildValidatedUrl(imageUrl)
      const response = await fetch(validatedUrl)
      const blob = await response.blob()
      onDone(new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
    } finally {
      setProcessing(false)
    }
  }

  // For rotated images, we apply CSS transform to the img and adjust container
  const isRotated90or270 = rotation === 90 || rotation === 270

  return (
    <div className="bg-background fixed inset-0 z-[9999] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
        >
          <X className="h-4 w-4" />
          <span>Cancel</span>
        </button>
        <h2 className="text-sm font-semibold">Edit Photo</h2>
        <Button
          type="button"
          size="sm"
          className="rounded-full px-4"
          onClick={handleDone}
          disabled={processing}
        >
          {processing ? 'Saving…' : 'Done'}
        </Button>
      </div>

      {/* Image area */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-2">
        <div
          className={cn(
            'relative max-h-full max-w-full',
            isRotated90or270 && 'flex items-center justify-center'
          )}
        >
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={getAspectRatio(aspectMode)}
            className="max-h-[60vh]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Edit"
              className="max-h-[60vh] max-w-full object-contain"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease',
              }}
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-card/80 border-border space-y-3 border-t px-4 pt-4 pb-8 backdrop-blur-sm">
        {/* Aspect ratio pills */}
        <div className="flex items-center justify-center gap-2">
          {ASPECT_OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              type="button"
              onClick={() => handleAspectChange(opt.mode)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                aspectMode === opt.mode
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              <opt.icon className="h-3 w-3" />
              {opt.label}
            </button>
          ))}
        </div>

        {/* Rotate buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleRotateLeft}
            className="bg-muted hover:bg-muted/80 text-foreground flex h-10 w-10 items-center justify-center rounded-full transition-colors"
            aria-label="Rotate left 90°"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <span className="text-muted-foreground text-xs tabular-nums">{rotation}°</span>
          <button
            type="button"
            onClick={handleRotateRight}
            className="bg-muted hover:bg-muted/80 text-foreground flex h-10 w-10 items-center justify-center rounded-full transition-colors"
            aria-label="Rotate right 90°"
          >
            <RotateCw className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
