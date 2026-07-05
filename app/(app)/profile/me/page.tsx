import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignedOutProfile } from '../[username]/components/signed-out-profile'
import { ThemeToggle } from '../[username]/components/theme-toggle'

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/setup-profile')
  }

  redirect(`/profile/${profile.username}`)
}
