'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const profileSchema = z.object({
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(30, 'Username must be 30 characters or less')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    ),
  bio: z.string().max(160, 'Bio must be 160 characters or less').optional(),
})

type ProfileForm = z.infer<typeof profileSchema>

export default function SetupProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) })

  const bioValue = watch('bio') ?? ''

  async function onSubmit(data: ProfileForm) {
    setLoading(true)
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      toast.error('Session expired. Please sign in again.')
      router.push('/login')
      return
    }

    // Check username isn't taken
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', data.username)
      .single()

    if (existing) {
      toast.error('That username is already taken. Try another.')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      username: data.username,
      bio: data.bio ?? null,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success(`Welcome to Cat-A-Log, @${data.username}! 🐱`)
    router.push('/map')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 text-center">
        <span className="text-4xl">🐾</span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">One last step</h1>
        <p className="text-muted-foreground text-sm mt-1">Choose your Cat-A-Log username</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set up your profile</CardTitle>
          <CardDescription>
            Your username is public and shown when you tag cats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  @
                </span>
                <Input
                  id="username"
                  placeholder="coolcatperson"
                  className="pl-7"
                  autoComplete="username"
                  {...register('username')}
                />
              </div>
              {errors.username && (
                <p className="text-destructive text-xs">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <Label htmlFor="bio">Bio <span className="text-muted-foreground">(optional)</span></Label>
                <span className="text-xs text-muted-foreground">{bioValue.length}/160</span>
              </div>
              <Input
                id="bio"
                placeholder="TNR volunteer, cat lover 🐱"
                maxLength={160}
                {...register('bio')}
              />
              {errors.bio && (
                <p className="text-destructive text-xs">{errors.bio.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving…' : 'Get started'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
