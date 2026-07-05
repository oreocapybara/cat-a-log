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
