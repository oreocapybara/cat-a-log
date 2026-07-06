'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Cat, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GoogleButton } from '@/app/components/google-button'
import { useReturnTo } from '@/lib/use-return-to'
import { notify } from '@/lib/toast'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

function PawPrintBackground() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 h-full w-full opacity-[0.04]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="paw-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          {/* Main pad */}
          <ellipse cx="40" cy="48" rx="8" ry="9" fill="currentColor" />
          {/* Toe beans */}
          <ellipse cx="30" cy="34" rx="4.5" ry="5.5" fill="currentColor" />
          <ellipse cx="50" cy="34" rx="4.5" ry="5.5" fill="currentColor" />
          <ellipse cx="36" cy="28" rx="3.5" ry="4.5" fill="currentColor" />
          <ellipse cx="44" cy="28" rx="3.5" ry="4.5" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#paw-pattern)" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const returnTo = useReturnTo()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('oauth_error')) {
      notify.error('google-sign-in-failed')
    }
  }, [])

  async function onSubmit(data: LoginForm) {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      notify.error('unknown-error')
      setLoading(false)
      return
    }

    // Check if profile exists (username set up)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        router.push(`/setup-profile${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`)
      } else {
        router.push(returnTo || '/map')
      }
    }
  }

  return (
    <div className="bg-background relative flex min-h-dvh flex-col items-center px-6 pt-16 pb-8">
      <PawPrintBackground />

      {/* Brand */}
      <div className="relative mb-10 text-center">
        <div className="bg-primary text-primary-foreground mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg shadow-orange-200 dark:shadow-orange-900/30">
          <Cat className="h-8 w-8" />
        </div>
        <h1 className="font-heading mt-4 text-3xl font-bold tracking-tight">
          Your cats missed you
        </h1>
        <p className="text-muted-foreground mt-1.5 text-base">Pick up where you left off</p>
      </div>

      {/* Content */}
      <div className="relative w-full max-w-sm space-y-6">
        {/* Google — primary action for most mobile users */}
        <GoogleButton label="Continue with Google" returnTo={returnTo ?? undefined} />

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="bg-border h-px flex-1" />
          <span className="text-muted-foreground text-xs tracking-wide uppercase">
            or use email
          </span>
          <div className="bg-border h-px flex-1" />
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="h-10 px-3 text-base"
              {...register('email')}
            />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-10 px-3 pr-10 text-base"
                {...register('password')}
              />
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-destructive text-xs">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="h-11 w-full text-base font-medium" disabled={loading}>
            {loading ? 'Signing in…' : 'Let me in'}
          </Button>
        </form>

        {/* Footer link */}
        <p className="text-muted-foreground text-center text-sm">
          New here?{' '}
          <Link
            href={returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : '/register'}
            className="text-primary font-medium underline underline-offset-4"
          >
            Join the community
          </Link>
        </p>
      </div>
    </div>
  )
}
