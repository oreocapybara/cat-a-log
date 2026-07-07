import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getImageEmbedding } from '@/lib/embeddings'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const imageFile = formData.get('image') as File | null
  const candidateIdsRaw = formData.get('candidateCatIds') as string | null

  if (!imageFile || !candidateIdsRaw) {
    return NextResponse.json(
      { error: 'Missing required fields: image (File) and candidateCatIds (JSON array)' },
      { status: 400 }
    )
  }

  const candidateCatIds = JSON.parse(candidateIdsRaw) as string[]

  const supabase = await createClient()

  try {
    const imageBytes = await imageFile.arrayBuffer()
    const embedding = await getImageEmbedding(imageBytes, imageFile.type || 'image/jpeg')

    const { data, error } = await supabase.rpc('nearby_cats_by_similarity', {
      cat_ids: candidateCatIds,
      query_embedding: JSON.stringify(embedding),
      limit_n: candidateCatIds.length,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      rankedIds: (data ?? []).map((row: { id: string; similarity: number }) => row.id),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analysis failed' },
      { status: 502 }
    )
  }
}
