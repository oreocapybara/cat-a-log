'use client'

import { useSyncExternalStore } from 'react'

function subscribe() {
  return () => {}
}

function getSnapshot() {
  return new URLSearchParams(window.location.search).get('returnTo')
}

function getServerSnapshot() {
  return null
}

// Reads ?returnTo from the URL. useSyncExternalStore (rather than
// useState+useEffect) reads it safely during the client render itself,
// with no SSR mismatch and no setState-in-effect.
export function useReturnTo(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
