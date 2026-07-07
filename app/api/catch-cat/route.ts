import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getImageEmbedding } from '@/lib/embeddings'

const ALLOWED_TAGS = ['needs_medical', 'possible_rabies', 'deceased'] as const
type CatTagValue = (typeof ALLOWED_TAGS)[number]

function isValidTag(tag: string): tag is CatTagValue {
  return (ALLOWED_TAGS as readonly string[]).includes(tag)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { photoUrl, lat, lng, name, isEarTipped, notes, tags } = body as {
    photoUrl: string
    lat: number
    lng: number
    name: string
    isEarTipped: boolean
    notes: string | null
    tags: string[]
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify the user has a profile row — the cats.tagged_by FK references profiles(id)
  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single()

  if (!profile) {
    return NextResponse.json(
      { error: 'Profile not found — please complete your profile first', code: 'NO_PROFILE' },
      { status: 403 }
    )
  }

  let embedding: number[] | null = null
  try {
    embedding = await getImageEmbedding(photoUrl)
  } catch {
    // Visual matching is an enhancement, not a requirement — the catch
    // still succeeds without an embedding.
  }

  const { data: cat, error: catError } = await supabase
    .from('cats')
    .insert({
      name,
      primary_photo_url: photoUrl,
      lat,
      lng,
      is_ear_tipped: isEarTipped,
      notes,
      tagged_by: user.id,
      photo_embedding: embedding,
    })
    .select('id')
    .single()

  if (catError || !cat) {
    return NextResponse.json({ error: catError?.message ?? 'Could not save cat' }, { status: 500 })
  }

  const validTags = tags.filter(isValidTag)
  if (validTags.length > 0) {
    await supabase.from('cat_tags').insert(
      validTags.map((tag) => ({
        cat_id: cat.id,
        tag,
        added_by: user.id,
      }))
    )
    // Not blocking on tag-insert failures — the catch itself already
    // succeeded, and tags are supplementary metadata.
  }

  return NextResponse.json({ catId: cat.id })
}
