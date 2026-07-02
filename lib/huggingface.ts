const HF_MODEL = 'sentence-transformers/clip-ViT-B-32'

export async function getImageEmbedding(imageUrl: string): Promise<number[]> {
  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) {
    throw new Error(`Could not fetch image: ${imageResponse.status}`)
  }
  const imageBytes = await imageResponse.arrayBuffer()

  const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
      'Content-Type': 'application/octet-stream',
    },
    body: imageBytes,
  })

  if (!response.ok) {
    throw new Error(`Hugging Face request failed: ${response.status}`)
  }

  const result = (await response.json()) as unknown

  // The feature-extraction pipeline can return either a flat vector or a
  // batch-shaped nested array depending on the model — normalize to flat.
  const embedding = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result

  if (!Array.isArray(embedding) || typeof embedding[0] !== 'number') {
    throw new Error('Unexpected embedding response shape from Hugging Face')
  }

  return embedding as number[]
}
