import Link from 'next/link'
import { Lock, User } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { GoogleButton } from '@/app/components/google-button'

export function SignedOutProfile() {
  return (
    <>
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 relative motion-safe:duration-300">
        <div className="bg-muted text-muted-foreground flex h-24 w-24 items-center justify-center rounded-full">
          <User className="h-10 w-10" />
        </div>
        <div className="bg-primary text-primary-foreground border-background motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:fill-mode-backwards absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full border-2 motion-safe:delay-150 motion-safe:duration-200">
          <Lock className="h-4 w-4" />
        </div>
      </div>

      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-backwards space-y-1 motion-safe:delay-100 motion-safe:duration-300">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Your profile</h1>
        <p className="text-muted-foreground text-sm">Sign in to see your tagged cats and stats.</p>
      </div>

      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-backwards w-full space-y-4 motion-safe:delay-200 motion-safe:duration-300">
        <GoogleButton label="Continue with Google" returnTo="/profile/me" />

        <div className="flex items-center gap-3">
          <div className="border-border h-px flex-1 border-t" />
          <span className="text-muted-foreground text-xs">or</span>
          <div className="border-border h-px flex-1 border-t" />
        </div>

        <Link
          href="/register?returnTo=/profile/me"
          className={buttonVariants({ variant: 'outline', className: 'w-full' })}
        >
          Sign up with email
        </Link>

        <p className="text-muted-foreground text-sm">
          Already tagging cats here?{' '}
          <Link
            href="/login?returnTo=/profile/me"
            className="text-primary underline underline-offset-4"
          >
            Log in
          </Link>
        </p>
      </div>
    </>
  )
}
