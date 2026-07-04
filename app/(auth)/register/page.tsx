'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Cat, Eye, EyeOff, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GoogleButton } from '@/app/components/google-button'
import { useReturnTo } from '@/lib/use-return-to'
import { toast } from 'sonner'

const registerSchema = z
  .object({
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must include at least one uppercase letter')
      .regex(/[0-9]/, 'Must include at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type RegisterForm = z.infer<typeof registerSchema>

function PawPrintBackground() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 h-full w-full opacity-[0.04]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="paw-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <ellipse cx="40" cy="48" rx="8" ry="9" fill="currentColor" />
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

function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <li className="flex items-center gap-1.5 text-xs">
      {met ? (
        <Check className="text-primary h-3.5 w-3.5" />
      ) : (
        <X className="text-muted-foreground h-3.5 w-3.5" />
      )}
      <span className={met ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </li>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const returnTo = useReturnTo()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const password = watch('password', '')

  const requirements = [
    { met: password.length >= 8, label: '8+ characters' },
    { met: /[A-Z]/.test(password), label: 'One uppercase letter' },
    { met: /[0-9]/.test(password), label: 'One number' },
  ]

  async function onSubmit(data: RegisterForm) {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success("You're in! Let's set up your profile.")
    router.push(`/setup-profile${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`)
  }

  return (
    <div className="bg-background relative flex min-h-dvh flex-col items-center px-6 pt-12 pb-8">
      <PawPrintBackground />

      {/* Brand */}
      <div className="relative mb-8 text-center">
        <div className="bg-primary text-primary-foreground mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg shadow-orange-200 dark:shadow-orange-900/30">
          <Cat className="h-8 w-8" />
        </div>
        <h1 className="font-heading mt-4 text-3xl font-bold tracking-tight">
          Every cat has a story
        </h1>
        <p className="text-muted-foreground mt-1.5 text-base">
          Be the one who tells it — join
          <span className="text-foreground font-medium"> Cat-A-Log</span>
        </p>
      </div>

      {/* Content */}
      <div className="relative w-full max-w-sm space-y-6">
        {/* Google — fastest path for most users */}
        <GoogleButton label="Sign up with Google" returnTo={returnTo ?? undefined} />

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
                autoComplete="new-password"
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
            {/* Inline password strength indicators */}
            {password.length > 0 && (
              <ul className="mt-2 space-y-1" aria-label="Password requirements">
                {requirements.map((req) => (
                  <PasswordRequirement key={req.label} met={req.met} label={req.label} />
                ))}
              </ul>
            )}
            {errors.password && !password && (
              <p className="text-destructive text-xs">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                className="h-10 px-3 pr-10 text-base"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 transition-colors"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="h-11 w-full text-base font-medium" disabled={loading}>
            {loading ? 'Setting things up…' : 'Start cataloging'}
          </Button>
        </form>

        {/* Footer link */}
        <p className="text-muted-foreground text-center text-sm">
          Already part of the crew?{' '}
          <Link
            href={returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login'}
            className="text-primary font-medium underline underline-offset-4"
          >
            Welcome back
          </Link>
        </p>
      </div>
    </div>
  )
}
