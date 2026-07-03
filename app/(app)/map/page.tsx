'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, MapPin, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CatPreviewCard } from './components/cat-preview-card'
import { FilterSheet, type CatFilters } from './components/filter-sheet'
import type { MapMoveEnd } from './components/cat-map'
import type { CatTag, NearbyCat } from '@/lib/supabase/types'

const CatMap = dynamic(() => import('./components/cat-map').then((mod) => mod.CatMap), {
  ssr: false,
})

const INITIAL_RADIUS_KM = 2

type LocationState =
  | { status: 'loading' }
  | { status: 'success'; lat: number; lng: number }
  | { status: 'error' }

export default function MapPage() {
  const [location, setLocation] = useState<LocationState>({ status: 'loading' })
  const [cats, setCats] = useState<NearbyCat[]>([])
  const [catTags, setCatTags] = useState<Map<string, CatTag['tag'][]>>(new Map())
  const [loadingCats, setLoadingCats] = useState(false)
  const [filters, setFilters] = useState<CatFilters>({ earTippedOnly: false, tags: [] })
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
  const [pendingSearch, setPendingSearch] = useState<MapMoveEnd | null>(null)
  const [searchStale, setSearchStale] = useState(false)
  // Leaflet fires `moveend` once immediately on mount (from the initial setView) —
  // ignore that first event so the pill doesn't flip to "stale" before the user has panned.
  const firstMoveEndRef = useRef(true)

  async function fetchCats(lat: number, lng: number, radiusKm: number) {
    setLoadingCats(true)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('nearby_cats', {
      user_lat: lat,
      user_lng: lng,
      radius_km: radiusKm,
    })

    if (error) {
      toast.error('Could not load nearby cats')
      setLoadingCats(false)
      return
    }

    const nearbyCats = data ?? []
    setCats(nearbyCats)
    setSelectedCatId(null)

    if (nearbyCats.length > 0) {
      const { data: tagRows, error: tagError } = await supabase
        .from('cat_tags')
        .select('cat_id, tag')
        .in(
          'cat_id',
          nearbyCats.map((cat: NearbyCat) => cat.id)
        )

      if (tagError) {
        toast.error('Could not load cat tags')
      } else {
        const tagMap = new Map<string, CatTag['tag'][]>()
        for (const row of tagRows ?? []) {
          tagMap.set(row.cat_id, [...(tagMap.get(row.cat_id) ?? []), row.tag])
        }
        setCatTags(tagMap)
      }
    } else {
      setCatTags(new Map())
    }

    setLoadingCats(false)
  }

  function fetchLocation() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setLocation({ status: 'success', lat, lng })
        fetchCats(lat, lng, INITIAL_RADIUS_KM)
      },
      () => setLocation({ status: 'error' }),
      { enableHighAccuracy: true }
    )
  }

  function retryLocation() {
    setLocation({ status: 'loading' })
    fetchLocation()
  }

  useEffect(() => {
    fetchLocation()
  }, [])

  function handleMoveEnd(move: MapMoveEnd) {
    if (firstMoveEndRef.current) {
      firstMoveEndRef.current = false
      return
    }
    setPendingSearch(move)
    setSearchStale(true)
  }

  function handleSearchThisArea() {
    if (!pendingSearch) return
    fetchCats(pendingSearch.lat, pendingSearch.lng, pendingSearch.radiusKm)
    setSearchStale(false)
  }

  function handleApplyFilters(next: CatFilters) {
    setFilters(next)
    setSelectedCatId(null)
  }

  const filteredCats = useMemo(() => {
    return cats.filter((cat) => {
      if (filters.earTippedOnly && !cat.is_ear_tipped) return false
      if (filters.tags.length > 0) {
        const tags = catTags.get(cat.id) ?? []
        if (!filters.tags.some((tag) => tags.includes(tag))) return false
      }
      return true
    })
  }, [cats, filters, catTags])

  const selectedCat = filteredCats.find((cat) => cat.id === selectedCatId) ?? null

  if (location.status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (location.status === 'error') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <MapPin className="text-muted-foreground h-8 w-8" />
        <p className="text-muted-foreground text-sm">Location unavailable</p>
        <Button type="button" variant="outline" onClick={retryLocation}>
          Tap to retry
        </Button>
      </div>
    )
  }

  return (
    <div className="relative h-screen overflow-hidden">
      <CatMap
        center={[location.lat, location.lng]}
        cats={filteredCats}
        selectedCatId={selectedCatId}
        onSelectCat={(cat) => setSelectedCatId(cat.id)}
        onMoveEnd={handleMoveEnd}
      />

      <div className="absolute inset-x-4 top-4 z-10 flex items-center gap-2">
        {searchStale ? (
          <Button
            type="button"
            variant="outline"
            className="bg-card flex-1 justify-start gap-2 rounded-full shadow-sm"
            onClick={handleSearchThisArea}
          >
            {loadingCats ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Search className="h-4 w-4 shrink-0" />
            )}
            <span className="text-sm">Search this area</span>
          </Button>
        ) : (
          <div className="border-border bg-card text-muted-foreground flex flex-1 items-center gap-2 rounded-full border px-4 py-2.5 shadow-sm">
            <Search className="h-4 w-4 shrink-0" />
            <span className="text-sm">
              {loadingCats
                ? 'Searching…'
                : filteredCats.length === 0
                  ? 'No cats found nearby'
                  : `${filteredCats.length} cat${filteredCats.length === 1 ? '' : 's'} nearby`}
            </span>
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="bg-card shrink-0 rounded-full shadow-sm"
          aria-label="Filter cats"
          onClick={() => setFilterSheetOpen(true)}
        >
          <SlidersHorizontal />
        </Button>
      </div>

      {selectedCat && (
        <CatPreviewCard
          cat={selectedCat}
          tags={catTags.get(selectedCat.id) ?? []}
          onClose={() => setSelectedCatId(null)}
        />
      )}

      <FilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filters={filters}
        onApply={handleApplyFilters}
      />
    </div>
  )
}
