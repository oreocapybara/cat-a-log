'use client'

import { useSyncExternalStore } from 'react'
import { getSafeRedirect } from '@/lib/safe-redirect'

function subscribe() {
  return () => {}
}

function getSnapshot() {
  const raw = new URLSearchParams(window.location.search).get('returnTo')
  if (!raw) return null

  // Validate and normalize through the safe redirect utility.
  // Returns the validated path, or '/map' if the input is suspicious.
  const validated = getSafeRedirect(raw)

  // If it resolved to the default fallback and the raw value wasn't already
  // '/map', the input was rejected — treat as no returnTo.
  if (validated === '/map' && raw !== '/map') {
    return null
  }

  return validated
}

function getServerSnapshot() {
  return null
}

/**
 * Reads ?returnTo from the URL and validates it against the safe redirect
 * allowlist. Returns null if the value is absent or rejected.
 *
 * useSyncExternalStore (rather than useState+useEffect) reads it safely
 * during the client render itself, with no SSR mismatch and no setState-in-effect.
 */
export function useReturnTo(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
