import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getImageEmbedding } from '@/lib/embeddings'

export async function POST(request: NextRequest) {
  const { catId, photoUrl } = (await request.json()) as { catId: string; photoUrl: string }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const embedding = await getImageEmbedding(photoUrl)
    await supabase.from('cats').update({ photo_embedding: embedding }).eq('id', catId)
  } catch {
    // Visual matching is an enhancement, not a requirement — the sighting
    // itself already succeeded regardless of whether this refresh works.
  }

  return NextResponse.json({ ok: true })
}
