import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getImageEmbedding } from '@/lib/huggingface'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { photoUrl, candidateCatIds } = body as { photoUrl: string; candidateCatIds: string[] }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const embedding = await getImageEmbedding(photoUrl)

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
