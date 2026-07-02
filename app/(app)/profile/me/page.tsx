'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    router.push('/login')
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6">
      <div className="space-y-2 text-center">
        <span className="text-5xl">🐾</span>
        <p className="text-muted-foreground">Your profile — coming in Day 4</p>
      </div>
      <Button variant="outline" onClick={handleSignOut} disabled={loading}>
        {loading ? 'Signing out…' : 'Sign out'}
      </Button>
    </div>
  )
}
