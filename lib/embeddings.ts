const VOYAGE_API_URL = 'https://api.voyageai.com/v1/multimodalembeddings'
const EMBEDDING_DIMENSION = 512

/**
 * Get a CLIP-style embedding for an image via Voyage AI's hosted multimodal
 * embeddings API. Deliberately a remote call, not an in-process model —
 * Vercel's serverless functions can't reliably bundle the native ONNX
 * runtime binary that in-process CLIP inference depends on.
 *
 * Accepts either a public image URL or raw image bytes.
 */
export async function getImageEmbedding(
  input: string | ArrayBuffer,
  mimeType = 'image/jpeg'
): Promise<number[]> {
  const content =
    typeof input === 'string'
      ? { type: 'image_url' as const, image_url: input }
      : {
          type: 'image_base64' as const,
          image_base64: `data:${mimeType};base64,${Buffer.from(input).toString('base64')}`,
        }

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // voyage-multimodal-3 only accepts its native 1024-dim output;
      // voyage-multimodal-3.5 supports the 512 dims our column already uses.
      model: 'voyage-multimodal-3.5',
      output_dimension: EMBEDDING_DIMENSION,
      inputs: [{ content: [content] }],
    }),
  })

  if (!response.ok) {
    throw new Error(`Voyage embedding request failed: ${response.status} ${await response.text()}`)
  }

  const { data } = (await response.json()) as { data: { embedding: number[] }[] }
  return data[0].embedding
}
