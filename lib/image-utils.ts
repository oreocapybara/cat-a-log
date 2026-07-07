/**
 * Resize an image blob to a square JPEG of the given max size.
 * Uses canvas for client-side processing — no server round-trip.
 */
export async function resizeImageToJpeg(
  source: Blob,
  maxSize: number = 512,
  quality: number = 0.85
): Promise<Blob> {
  const bitmap = await createImageBitmap(source)

  const canvas = document.createElement('canvas')
  canvas.width = maxSize
  canvas.height = maxSize

  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Draw the source image scaled to fill the target dimensions
  ctx.drawImage(bitmap, 0, 0, maxSize, maxSize)
  bitmap.close()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create JPEG blob'))
        }
      },
      'image/jpeg',
      quality
    )
  })
}

/**
 * Resize an image blob so its longest side fits within `maxDimension`,
 * preserving aspect ratio. Returns JPEG. If the image is already small
 * enough, it's re-encoded at the target quality without up-scaling.
 */
export async function resizeImageFit(
  source: Blob,
  maxDimension: number = 1024,
  quality: number = 0.8
): Promise<Blob> {
  const bitmap = await createImageBitmap(source)
  const { width, height } = bitmap

  let targetWidth = width
  let targetHeight = height

  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height)
    targetWidth = Math.round(width * scale)
    targetHeight = Math.round(height * scale)
  }

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)
  bitmap.close()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create JPEG blob'))
        }
      },
      'image/jpeg',
      quality
    )
  })
}
