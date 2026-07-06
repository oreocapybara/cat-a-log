'use client'

import { useCallback, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Plus, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSeenFlag } from '@/lib/use-seen-flag'

const NAV_ITEMS = [
  { href: '/map', label: 'Map', icon: Map },
  { href: '/tag', label: 'Tag', icon: Plus, isFab: true },
  { href: '/profile/me', label: 'Profile', icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [hasSeenPulse, markPulseSeen] = useSeenFlag('hasSeenFabPulse')
  const fabRef = useRef<HTMLAnchorElement>(null)

  const handleAnimationEnd = useCallback(() => {
    markPulseSeen()
  }, [markPulseSeen])

  const handleFabClick = useCallback(() => {
    markPulseSeen()
  }, [markPulseSeen])

  // Hide the nav bar during the tagging flow for a full-screen experience
  if (pathname.startsWith('/tag')) return null

  return (
    <nav className="bg-card/70 dark:bg-card/90 fixed inset-x-4 bottom-4 z-50 rounded-full border border-white/40 shadow-lg backdrop-blur-md dark:border-white/10">
      <div className="pb-safe flex items-center justify-around px-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon, isFab }) => {
          const isActive =
            pathname.startsWith(href) && !(href === '/map' && pathname.startsWith('/matches'))

          if (isFab) {
            return (
              <Link
                key={href}
                ref={fabRef}
                href={href}
                aria-label={label}
                data-fab-pulse={!hasSeenPulse ? '' : undefined}
                onAnimationEnd={!hasSeenPulse ? handleAnimationEnd : undefined}
                onClick={handleFabClick}
                className="bg-primary text-primary-foreground shadow-primary/30 relative -top-4 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95"
              >
                <Icon className="h-6 w-6" strokeWidth={2.5} />
              </Link>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'fill-primary/20')} />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
