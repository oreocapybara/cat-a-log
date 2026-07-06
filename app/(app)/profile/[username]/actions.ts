'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateProfile(data: { username: string; bio: string | null }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated', redirectTo: null }
  }

  const username = data.username.trim().toLowerCase()
  const bio = data.bio?.trim() || null

  // Validate username format
  if (username.length < 2 || username.length > 30) {
    return { error: 'Username must be between 2 and 30 characters', redirectTo: null }
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return {
      error: 'Username can only contain letters, numbers, underscores, and hyphens',
      redirectTo: null,
    }
  }

  // Validate bio length
  if (bio && bio.length > 160) {
    return { error: 'Bio must be 160 characters or less', redirectTo: null }
  }

  // Check uniqueness — exclude own profile
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .neq('id', user.id)
    .single()

  if (existing) {
    return { error: 'That username is already taken', redirectTo: null }
  }

  // Get current username for revalidation + redirect decision
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  const { error } = await supabase.from('profiles').update({ username, bio }).eq('id', user.id)

  if (error) {
    return { error: error.message, redirectTo: null }
  }

  const usernameChanged = currentProfile?.username !== username

  // Revalidate both old and new paths
  if (currentProfile) {
    revalidatePath(`/profile/${currentProfile.username}`)
  }
  if (usernameChanged) {
    revalidatePath(`/profile/${username}`)
  }
  revalidatePath('/profile/me')

  return { error: null, redirectTo: usernameChanged ? '/profile/me' : null }
}

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
