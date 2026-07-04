'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration guard: must run after mount
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <Button type="button" variant="outline" size="icon" aria-label="Toggle theme" disabled>
        <Sun />
      </Button>
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative overflow-hidden"
    >
      <Sun
        className={`absolute transition-all duration-300 ${isDark ? 'scale-0 -rotate-90' : 'scale-100 rotate-0'}`}
      />
      <Moon
        className={`absolute transition-all duration-300 ${isDark ? 'scale-100 rotate-0' : 'scale-0 rotate-90'}`}
      />
    </Button>
  )
}
