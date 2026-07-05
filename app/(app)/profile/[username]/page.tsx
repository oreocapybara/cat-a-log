import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ProfileHeader } from './components/profile-header'
import { FeaturedCatCard } from './components/featured-cat-card'
import { MyCatsList } from './components/my-cats-list'
import { SignOutButton } from './components/sign-out-button'
import { AvatarUploadProvider } from './components/avatar-upload-provider'
import { AvatarUploadDialog } from './components/avatar-upload-dialog'

type Props = {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, bio')
    .eq('username', username)
    .single()

  if (!profile) return { title: 'Profile not found' }

  return {
    title: `@${profile.username} on Cat-A-Log`,
    description: profile.bio ?? `Check out @${profile.username}'s tagged cats on Cat-A-Log`,
    openGraph: {
      title: `@${profile.username} on Cat-A-Log`,
      description: profile.bio ?? `Check out @${profile.username}'s tagged cats`,
      images: [{ url: `/api/profile-card/${profile.username}`, width: 1080, height: 1920 }],
    },
  }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()

  // Fetch the profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio, featured_cat_id')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  // Determine if the viewer is the owner
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isOwner = user?.id === profile.id

  // Fetch the user's cats
  const { data: myCats } = await supabase
    .from('cats')
    .select('id, name, primary_photo_url, created_at')
    .eq('tagged_by', profile.id)
    .order('created_at', { ascending: false })

  const catIds = (myCats ?? []).map((cat) => cat.id)

  const [{ data: tagRows }, { data: sightingRows }] =
    catIds.length > 0
      ? await Promise.all([
          supabase.from('cat_tags').select('*').in('cat_id', catIds),
          supabase.from('sightings').select('cat_id').in('cat_id', catIds),
        ])
      : [{ data: [] }, { data: [] }]

  const sightingCounts = new Map<string, number>()
  for (const row of sightingRows ?? []) {
    sightingCounts.set(row.cat_id, (sightingCounts.get(row.cat_id) ?? 0) + 1)
  }

  const cats = (myCats ?? []).map((cat) => ({
    ...cat,
    timesSpotted: 1 + (sightingCounts.get(cat.id) ?? 0),
  }))

  const totalSightings = cats.reduce((sum, cat) => sum + cat.timesSpotted, 0)

  // Determine featured cat: explicit pick or highest-tier auto-select
  const featuredCat = (() => {
    if (profile.featured_cat_id) {
      const picked = cats.find((c) => c.id === profile.featured_cat_id)
      if (picked) return picked
    }
    // Auto-select: highest times_spotted
    if (cats.length === 0) return null
    return cats.reduce((best, cat) => (cat.timesSpotted > best.timesSpotted ? cat : best), cats[0])
  })()

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center gap-6 px-4 py-6 text-center">
      {isOwner ? (
        <AvatarUploadProvider userId={profile.id}>
          <ProfileHeader
            username={profile.username}
            avatarUrl={profile.avatar_url}
            bio={profile.bio}
            catsCount={cats.length}
            totalSightings={totalSightings}
            isOwner={isOwner}
          />
          <AvatarUploadDialog hasAvatar={!!profile.avatar_url} />
        </AvatarUploadProvider>
      ) : (
        <ProfileHeader
          username={profile.username}
          avatarUrl={profile.avatar_url}
          bio={profile.bio}
          catsCount={cats.length}
          totalSightings={totalSightings}
          isOwner={isOwner}
        />
      )}

      {/* Featured cat */}
      {featuredCat && <FeaturedCatCard cat={featuredCat} />}

      {/* Owner actions */}
      {isOwner && (
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-backwards w-full motion-safe:delay-200 motion-safe:duration-300">
          <SignOutButton />
        </div>
      )}

      {/* Cats list */}
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-backwards w-full text-left motion-safe:delay-300 motion-safe:duration-300">
        <h2 className="font-heading mb-3 text-lg font-bold tracking-tight">
          {isOwner ? 'My Cats' : `${profile.username}'s Cats`}
        </h2>
        {isOwner && cats.length > 0 ? (
          <MyCatsList
            cats={cats}
            initialTags={tagRows ?? []}
            currentUserId={profile.id}
            featuredCatId={profile.featured_cat_id}
          />
        ) : cats.length > 0 ? (
          <div className="flex w-full flex-col gap-3">
            {cats.map((cat) => (
              <a
                key={cat.id}
                href={`/map?cat=${cat.id}`}
                className="bg-card hover:bg-muted/50 flex items-center gap-3 rounded-xl border p-3 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cat.primary_photo_url}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-heading truncate text-base font-bold">
                    {cat.name ?? 'Unnamed cat'}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Spotted {cat.timesSpotted} time{cat.timesSpotted === 1 ? '' : 's'}
                  </p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {isOwner ? "You haven't tagged any cats yet" : 'No cats tagged yet'}
          </p>
        )}
      </div>
    </div>
  )
}
