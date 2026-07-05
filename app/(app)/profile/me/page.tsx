import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignedOutProfile } from '../[username]/components/signed-out-profile'
import { ThemeToggle } from '../[username]/components/theme-toggle'
import { ProfileHeader } from '../[username]/components/profile-header'
import { FeaturedCatCard } from '../[username]/components/featured-cat-card'
import { MyCatsList } from '../[username]/components/my-cats-list'
import { SignOutButton } from '../[username]/components/sign-out-button'
import { AvatarUploadProvider } from '../[username]/components/avatar-upload-provider'
import { AvatarUploadDialog } from '../[username]/components/avatar-upload-dialog'

export default async function ProfileMePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center gap-6 px-4 py-6 text-center">
        <div className="flex w-full justify-end">
          <ThemeToggle />
        </div>
        <SignedOutProfile />
      </div>
    )
  }

  // Fetch profile and cats in parallel instead of sequential redirect
  const [{ data: profile }, { data: myCats }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, featured_cat_id')
      .eq('id', user.id)
      .single(),
    supabase
      .from('cats')
      .select('id, name, primary_photo_url, created_at')
      .eq('tagged_by', user.id)
      .order('created_at', { ascending: false }),
  ])

  if (!profile) {
    redirect('/setup-profile')
  }

  // Fetch tags and sightings in parallel (only if user has cats)
  const catIds = (myCats ?? []).map((cat) => cat.id)

  const [{ data: tagRows }, { data: sightingRows }] =
    catIds.length > 0
      ? await Promise.all([
          supabase.from('cat_tags').select('*').in('cat_id', catIds),
          supabase.from('sightings').select('cat_id').in('cat_id', catIds),
        ])
      : [{ data: [] as never[] }, { data: [] as never[] }]

  const sightingCounts = new Map<string, number>()
  for (const row of sightingRows ?? []) {
    sightingCounts.set(row.cat_id, (sightingCounts.get(row.cat_id) ?? 0) + 1)
  }

  const cats = (myCats ?? []).map((cat) => ({
    ...cat,
    timesSpotted: 1 + (sightingCounts.get(cat.id) ?? 0),
  }))

  const totalSightings = cats.reduce((sum, cat) => sum + cat.timesSpotted, 0)

  // Determine featured cat
  const featuredCat = (() => {
    if (profile.featured_cat_id) {
      const picked = cats.find((c) => c.id === profile.featured_cat_id)
      if (picked) return picked
    }
    if (cats.length === 0) return null
    return cats.reduce((best, cat) => (cat.timesSpotted > best.timesSpotted ? cat : best), cats[0])
  })()

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center gap-6 px-4 py-6 text-center">
      <AvatarUploadProvider userId={profile.id}>
        <ProfileHeader
          username={profile.username}
          avatarUrl={profile.avatar_url}
          bio={profile.bio}
          catsCount={cats.length}
          totalSightings={totalSightings}
          isOwner={true}
        />
        <AvatarUploadDialog hasAvatar={!!profile.avatar_url} />
      </AvatarUploadProvider>

      {/* Featured cat */}
      {featuredCat && <FeaturedCatCard cat={featuredCat} />}

      {/* Owner actions */}
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-backwards w-full motion-safe:delay-200 motion-safe:duration-300">
        <SignOutButton />
      </div>

      {/* Cats list */}
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-backwards w-full text-left motion-safe:delay-300 motion-safe:duration-300">
        <h2 className="font-heading mb-3 text-lg font-bold tracking-tight">My Cats</h2>
        {cats.length > 0 ? (
          <MyCatsList
            cats={cats}
            initialTags={tagRows ?? []}
            currentUserId={profile.id}
            featuredCatId={profile.featured_cat_id}
          />
        ) : (
          <p className="text-muted-foreground py-6 text-center text-sm">
            You haven&apos;t tagged any cats yet
          </p>
        )}
      </div>
    </div>
  )
}
