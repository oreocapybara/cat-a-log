'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { notify } from '@/lib/toast'
import { CatPreviewCard } from './components/cat-preview-card'
import { FilterSheet, type CatFilters, matchesFilters } from './components/filter-sheet'
import { SearchBar, type SearchedCat } from './components/search-bar'
import { SearchThisAreaPill } from './components/search-this-area-pill'
import { LocateButton, type LocationMode } from './components/locate-button'
import { MapAttribution } from './components/map-attribution'
import { MapSkeleton } from './components/map-skeleton'
import type { MapMoveEnd } from './components/cat-map'
import type { CatTag, NearbyCat } from '@/lib/supabase/types'

const CatMap = dynamic(() => import('./components/cat-map').then((mod) => mod.CatMap), {
  ssr: false,
  loading: () => <MapSkeleton />,
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
  const [searchBarResetKey, setSearchBarResetKey] = useState(0)
  const [searchBarExpanded, setSearchBarExpanded] = useState(false)
  const [flyToTarget, setFlyToTarget] = useState<[number, number] | null>(null)
  const [flyToZoom, setFlyToZoom] = useState<number | undefined>(undefined)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locationMode, setLocationMode] = useState<LocationMode>('idle')
  const [cardHeight, setCardHeight] = useState(0)
  // Leaflet fires `moveend` once immediately on mount (from the initial setView) —
  // ignore that first event so the pill doesn't flip to "stale" before the user has panned.
  const firstMoveEndRef = useRef(true)
  const watchIdRef = useRef<number | null>(null)

  async function fetchCats(lat: number, lng: number, radiusKm: number, selectCatId?: string) {
    setLoadingCats(true)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('nearby_cats', {
      user_lat: lat,
      user_lng: lng,
      radius_km: radiusKm,
    })

    if (error) {
      notify.error('load-nearby-failed')
      setLoadingCats(false)
      return
    }

    const nearbyCats = data ?? []
    setCats(nearbyCats)
    setSelectedCatId(selectCatId ?? null)

    if (nearbyCats.length > 0) {
      const { data: tagRows, error: tagError } = await supabase
        .from('cat_tags')
        .select('cat_id, tag')
        .in(
          'cat_id',
          nearbyCats.map((cat: NearbyCat) => cat.id)
        )
        .is('resolved_at', null)

      if (!tagError) {
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
    const initialCatId = new URLSearchParams(window.location.search).get('cat')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setLocation({ status: 'success', lat, lng })
        setUserLocation([lat, lng])
        fetchCats(lat, lng, INITIAL_RADIUS_KM, initialCatId ?? undefined)
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

  // Stop any in-flight watchPosition subscription if the page unmounts mid-tracking.
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  function stopFollowing() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setLocationMode('idle')
  }

  function startFollowing() {
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const next: [number, number] = [position.coords.latitude, position.coords.longitude]
        setUserLocation(next)
        setFlyToTarget(next)
        setFlyToZoom(undefined)
      },
      () => {
        stopFollowing()
      },
      { enableHighAccuracy: true }
    )
    setLocationMode('following')
  }

  function handleLocateClick() {
    if (locationMode === 'following') {
      stopFollowing()
      return
    }
    if (locationMode === 'centered') {
      startFollowing()
      return
    }
    setLocationMode('locating')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next: [number, number] = [position.coords.latitude, position.coords.longitude]
        setUserLocation(next)
        setFlyToTarget(next)
        setFlyToZoom(undefined)
        setLocationMode('centered')
      },
      () => {
        notify.error('location-unavailable')
        setLocationMode('idle')
      },
      { enableHighAccuracy: true }
    )
  }

  function handleUserDrag() {
    if (locationMode === 'following') stopFollowing()
  }

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
    setSearchBarResetKey((n) => n + 1)
  }

  async function handleSelectSearchedCat(cat: SearchedCat) {
    await fetchCats(cat.lat, cat.lng, INITIAL_RADIUS_KM)
    setFlyToTarget([cat.lat, cat.lng])
    setFlyToZoom(17)
    setSelectedCatId(cat.id)
  }

  function handleApplyFilters(next: CatFilters) {
    setFilters(next)
    setSelectedCatId(null)
  }

  async function handleResolveTag(catId: string, tag: CatTag['tag']) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const prevTags = catTags.get(catId) ?? []
    setCatTags((prev) =>
      new Map(prev).set(
        catId,
        prevTags.filter((t) => t !== tag)
      )
    )

    const { error } = await supabase
      .from('cat_tags')
      .update({ resolved_at: new Date().toISOString(), resolved_by: user.id })
      .eq('cat_id', catId)
      .eq('tag', tag)
      .is('resolved_at', null)

    if (error) {
      setCatTags((prev) => new Map(prev).set(catId, prevTags))
      notify.error('unknown-error')
    }
  }

  async function handleUndoResolveTag(catId: string, tag: CatTag['tag']) {
    // Restore the tag in local state
    setCatTags((prev) => {
      const current = prev.get(catId) ?? []
      if (current.includes(tag)) return prev
      return new Map(prev).set(catId, [...current, tag])
    })

    // Revert the resolve in DB
    const supabase = createClient()
    const { error } = await supabase
      .from('cat_tags')
      .update({ resolved_at: null, resolved_by: null })
      .eq('cat_id', catId)
      .eq('tag', tag)

    if (error) {
      // Remove tag again if revert failed
      setCatTags((prev) => {
        const current = prev.get(catId) ?? []
        return new Map(prev).set(
          catId,
          current.filter((t) => t !== tag)
        )
      })
      notify.error('undo-expired')
    }
  }

  const filteredCats = useMemo(() => {
    return cats.filter((cat) => matchesFilters(cat, catTags.get(cat.id) ?? [], filters))
  }, [cats, filters, catTags])

  const selectedCat = filteredCats.find((cat) => cat.id === selectedCatId) ?? null

  if (location.status === 'loading') {
    return <MapSkeleton />
  }

  if (location.status === 'error') {
    return (
      <div className="-mb-28 flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <MapPin className="text-muted-foreground h-8 w-8" />
        <p className="text-muted-foreground text-sm">Location unavailable</p>
        <Button type="button" variant="outline" onClick={retryLocation}>
          Tap to retry
        </Button>
      </div>
    )
  }

  return (
    <div className="relative -mb-28 h-dvh overflow-hidden">
      <CatMap
        center={[location.lat, location.lng]}
        userLocation={userLocation ?? [location.lat, location.lng]}
        cats={filteredCats}
        catTags={catTags}
        selectedCatId={selectedCatId}
        onSelectCat={(cat) => {
          setSelectedCatId(cat.id)
        }}
        onMoveEnd={handleMoveEnd}
        onUserDrag={handleUserDrag}
        flyTo={flyToTarget}
        flyToZoom={flyToZoom}
      />

      <div className="absolute inset-x-4 top-4 z-10 flex items-center gap-2">
        <SearchBar
          resetSignal={searchBarResetKey}
          userLocation={{ lat: location.lat, lng: location.lng }}
          onSelectCat={handleSelectSearchedCat}
          onExpandChange={setSearchBarExpanded}
          displayContent={
            loadingCats
              ? 'Searching…'
              : filteredCats.length === 0
                ? 'No cats found nearby'
                : `${filteredCats.length} cat${filteredCats.length === 1 ? '' : 's'} nearby`
          }
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="bg-card/70 dark:bg-card/90 relative shrink-0 rounded-full border-white/40 shadow-sm backdrop-blur-md dark:border-white/10"
          aria-label={
            filters.earTippedOnly || filters.tags.length > 0
              ? 'Filter cats (filters active)'
              : 'Filter cats'
          }
          onClick={() => {
            setFilterSheetOpen(true)
          }}
        >
          <SlidersHorizontal />
          {(filters.earTippedOnly || filters.tags.length > 0) && (
            <span className="bg-primary border-card absolute top-1 right-1 h-2 w-2 rounded-full border" />
          )}
        </Button>
      </div>

      <SearchThisAreaPill
        visible={searchStale && !searchBarExpanded}
        loading={loadingCats}
        onSearch={handleSearchThisArea}
      />

      <LocateButton mode={locationMode} cardHeight={cardHeight} onClick={handleLocateClick} />
      <MapAttribution />

      <CatPreviewCard
        cat={selectedCat}
        tags={selectedCat ? (catTags.get(selectedCat.id) ?? []) : []}
        onClose={() => setSelectedCatId(null)}
        onViewLocation={(lat, lng) => {
          setFlyToTarget([lat, lng])
          setFlyToZoom(undefined)
        }}
        onResolveTag={handleResolveTag}
        onUndoResolveTag={handleUndoResolveTag}
        onHeightChange={setCardHeight}
      />

      <FilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filters={filters}
        onApply={handleApplyFilters}
        cats={cats}
        catTags={catTags}
      />
    </div>
  )
}
