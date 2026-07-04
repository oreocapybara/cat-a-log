'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Loader2, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { distanceKm } from '@/lib/geo'

const DEBOUNCE_MS = 300
const MAX_RESULTS = 10

export type SearchedCat = {
  id: string
  name: string | null
  primary_photo_url: string
  lat: number
  lng: number
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m away`
  return `${km.toFixed(1)}km away`
}

export function SearchBar({
  userLocation,
  displayContent,
  onSelectCat,
  resetSignal,
}: {
  userLocation: { lat: number; lng: number }
  displayContent: React.ReactNode
  onSelectCat: (cat: SearchedCat) => void
  resetSignal?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchedCat[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (resetSignal === undefined) return
    collapse()
  }, [resetSignal])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) return

    // setSearching/setResults live inside this deferred callback (not the
    // effect body itself) since they're driven by the debounce timer firing,
    // not by the effect running.
    const timeout = setTimeout(async () => {
      setSearching(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('cats')
        .select('id, name, primary_photo_url, lat, lng')
        .ilike('name', `%${trimmed}%`)
        .limit(MAX_RESULTS)

      if (!error) setResults(data ?? [])
      setSearching(false)
    }, DEBOUNCE_MS)

    return () => clearTimeout(timeout)
  }, [query])

  function collapse() {
    setExpanded(false)
    setQuery('')
    setResults([])
  }

  function clearText() {
    setQuery('')
    setResults([])
    inputRef.current?.focus()
  }

  function selectResult(cat: SearchedCat) {
    onSelectCat(cat)
    collapse()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      collapse()
    } else if (e.key === 'Enter' && results.length === 1) {
      selectResult(results[0])
    }
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="bg-card/70 dark:bg-card/50 text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 flex flex-1 cursor-pointer items-center gap-2 rounded-full border border-white/40 px-4 py-2.5 text-left shadow-sm backdrop-blur-md duration-150 dark:border-white/10"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate text-sm">{displayContent}</span>
      </button>
    )
  }

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 relative flex-1 duration-150">
      <div className="bg-card/70 dark:bg-card/50 focus-within:ring-primary/40 flex items-center gap-2 rounded-full border border-white/40 py-1 pr-2 pl-1 shadow-sm backdrop-blur-md transition-shadow focus-within:ring-2 dark:border-white/10">
        <button
          type="button"
          onClick={collapse}
          aria-label="Back"
          className="text-muted-foreground hover:text-foreground flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search cats by name…"
          className="h-7 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
        {query && (
          <button
            type="button"
            onClick={clearText}
            aria-label="Clear search text"
            className="text-muted-foreground hover:text-foreground motion-safe:animate-in motion-safe:zoom-in-50 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {query.trim() && (
        <div className="bg-card/95 border-border/60 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 absolute inset-x-0 top-full z-20 mt-1.5 max-h-64 overflow-y-auto rounded-2xl border shadow-lg backdrop-blur-md duration-150">
          {searching ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 px-4 py-4 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <p className="text-muted-foreground px-4 py-4 text-center text-sm">
              No cats named “{query.trim()}”
            </p>
          ) : (
            results.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => selectResult(cat)}
                className="hover:bg-muted flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left first:rounded-t-2xl last:rounded-b-2xl"
              >
                <div className="bg-secondary h-9 w-9 shrink-0 overflow-hidden rounded-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cat.primary_photo_url} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{cat.name ?? 'Unnamed cat'}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatDistance(
                      distanceKm(userLocation.lat, userLocation.lng, cat.lat, cat.lng)
                    )}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
