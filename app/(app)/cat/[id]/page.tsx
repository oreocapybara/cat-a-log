import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: cat } = await supabase
    .from('cats')
    .select('id, name, primary_photo_url, notes, tagged_by')
    .eq('id', id)
    .single()

  if (!cat) {
    return { title: 'Cat not found — Cat-A-Log' }
  }

  const title = cat.name ? `${cat.name} on Cat-A-Log` : 'A stray cat on Cat-A-Log'
  const description = cat.notes ?? `Check out this cat spotted and tagged on Cat-A-Log 🐾`
  const cardImageUrl = `/api/catch-card?catId=${cat.id}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: cardImageUrl, width: 1080, height: 1920, alt: title }],
      type: 'article',
      siteName: 'Cat-A-Log',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [cardImageUrl],
    },
  }
}

/**
 * Shareable cat page — exists solely for social platform link previews.
 * When a user visits this URL directly, they're redirected to the map
 * with the cat selected.
 */
export default async function CatPage({ params }: Props) {
  const { id } = await params
  redirect(`/map?cat=${id}`)
}
