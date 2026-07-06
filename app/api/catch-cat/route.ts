import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getImageEmbedding } from '@/lib/huggingface'

const ALLOWED_TAGS = ['needs_medical', 'possible_rabies', 'deceased', 'invasive_risk'] as const
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
    const { data: insertedTags } = await supabase
      .from('cat_tags')
      .insert(
        validTags.map((tag) => ({
          cat_id: cat.id,
          tag,
          added_by: user.id,
          ...(tag === 'invasive_risk' ? { verification_status: 'pending' as const } : {}),
        }))
      )
      .select('id, tag')

    // Auto-insert first confirm vote for invasive_risk
    if (insertedTags) {
      const invasiveRow = insertedTags.find((t) => t.tag === 'invasive_risk')
      if (invasiveRow) {
        await supabase.from('invasive_risk_votes').insert({
          cat_tag_id: invasiveRow.id,
          voted_by: user.id,
          vote: 'confirm',
        })
      }
    }
  }

  return NextResponse.json({ catId: cat.id })
}
