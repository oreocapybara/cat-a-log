'use client'

import { useCallback, useEffect, useState } from 'react'

// Defaults to `true` (hidden) until mounted — the server has no access to
// localStorage, so the first client render must agree with the server to
// avoid a hydration mismatch. The real value is read in an effect and only
// then can a hint appear.
export function useSeenFlag(key: string): [boolean, () => void] {
  const [seen, setSeen] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration guard: localStorage only exists client-side
    setSeen(localStorage.getItem(key) === '1')
  }, [key])

  const markSeen = useCallback(() => {
    localStorage.setItem(key, '1')
    setSeen(true)
  }, [key])

  return [seen, markSeen]
}
