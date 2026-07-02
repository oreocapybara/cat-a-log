'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Plus, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/map', label: 'Map', icon: Map },
  { href: '/tag', label: 'Tag', icon: Plus, isFab: true },
  { href: '/profile/me', label: 'Profile', icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-around px-4 pb-safe">
        {NAV_ITEMS.map(({ href, label, icon: Icon, isFab }) => {
          const isActive = pathname.startsWith(href) && !(href === '/map' && pathname.startsWith('/matches'))

          if (isFab) {
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className="relative -top-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
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
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
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
