'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateAvatar(avatarUrl: string | null) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  // Get the username to revalidate the correct path
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  if (profile) {
    revalidatePath(`/profile/${profile.username}`)
  }

  return { error: null }
}

export async function setFeaturedCat(catId: string | null) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // If setting a cat, verify the user owns it
  if (catId) {
    const { data: cat } = await supabase
      .from('cats')
      .select('id')
      .eq('id', catId)
      .eq('tagged_by', user.id)
      .single()

    if (!cat) {
      return { error: 'Cat not found or not owned by you' }
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ featured_cat_id: catId })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  // Get the username to revalidate the correct path
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  if (profile) {
    revalidatePath(`/profile/${profile.username}`)
  }

  return { error: null }
}
