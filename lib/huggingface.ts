import { pipeline, type ImageFeatureExtractionPipeline } from '@huggingface/transformers'

const MODEL = 'Xenova/clip-vit-base-patch32'

let extractorPromise: Promise<ImageFeatureExtractionPipeline> | null = null

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline('image-feature-extraction', MODEL)
  }
  return extractorPromise
}

/**
 * Get a CLIP embedding for an image, run locally via transformers.js —
 * Hugging Face's hosted Inference API no longer serves image-embedding models.
 *
 * Accepts either:
 * - A URL string
 * - An ArrayBuffer / Buffer — raw image bytes
 */
export async function getImageEmbedding(input: string | ArrayBuffer): Promise<number[]> {
  const extractor = await getExtractor()
  const image = typeof input === 'string' ? input : new Blob([input])

  const output = await extractor(image)

  return Array.from(output.data as Float32Array)
}
