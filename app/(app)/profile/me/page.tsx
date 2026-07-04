import { User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from './components/sign-out-button'
import { ThemeToggle } from './components/theme-toggle'
import { MyCatsList } from './components/my-cats-list'
import { SignedOutProfile } from './components/signed-out-profile'

export default async function ProfilePage() {
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url, bio')
    .eq('id', user.id)
    .single()

  const initials = profile?.username ? profile.username.slice(0, 2).toUpperCase() : null

  const { data: myCats } = await supabase
    .from('cats')
    .select('id, name, primary_photo_url, created_at')
    .eq('tagged_by', user.id)
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
    // Same formula nearby_cats() uses: the tagging itself counts as sighting 1.
    timesSpotted: 1 + (sightingCounts.get(cat.id) ?? 0),
  }))

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center gap-6 px-4 py-6 text-center">
      <div className="flex w-full justify-end">
        <ThemeToggle />
      </div>

      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatar_url}
          alt={profile.username}
          className="border-border h-24 w-24 rounded-full border object-cover"
        />
      ) : (
        <div className="bg-primary text-primary-foreground flex h-24 w-24 items-center justify-center rounded-full text-2xl font-semibold">
          {initials ?? <User className="h-10 w-10" />}
        </div>
      )}

      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {profile?.username ? `@${profile.username}` : 'Your profile'}
        </h1>
        {profile?.bio && <p className="text-muted-foreground text-sm">{profile.bio}</p>}
      </div>

      <SignOutButton />

      <div className="w-full text-left">
        <h2 className="font-heading mb-3 text-lg font-bold tracking-tight">My Cats</h2>
        <MyCatsList cats={cats} initialTags={tagRows ?? []} currentUserId={user.id} />
      </div>
    </div>
  )
}
