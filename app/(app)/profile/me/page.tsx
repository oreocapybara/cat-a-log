import { redirect } from 'next/navigation'
import { User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from './components/sign-out-button'
import { ThemeToggle } from './components/theme-toggle'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url, bio')
    .eq('id', user.id)
    .single()

  const initials = profile?.username ? profile.username.slice(0, 2).toUpperCase() : null

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 px-4 py-6 text-center">
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
    </div>
  )
}
