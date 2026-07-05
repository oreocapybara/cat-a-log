'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTheme } from 'next-themes'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  buildClusterIndex,
  getMapPoints,
  separateOverlappingCats,
  type MapPoint,
} from '@/lib/clustering'
import {
  formatLastSeen,
  getStalenessOpacity,
  getStalenessTier,
  type StalenessTier,
} from '@/lib/geo'
import { DEFAULT_WELFARE_COLOR, getWelfareTier } from '@/lib/welfare-colors'
import type { CatTag, NearbyCat } from '@/lib/supabase/types'

export type MapMoveEnd = { lat: number; lng: number; radiusKm: number }

// CARTO's dark_all basemap is near-black — legible indoors, but this app is
// used outdoors on a phone where reading streets/labels matters more than
// matching the app chrome. Dark mode reuses the light basemap and tones it to
// neutral gray with a CSS filter (map-tiles-dark, globals.css) instead.
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

const userIcon = L.divIcon({
  className: '',
  html: '<span class="map-user-pulse block h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-500 shadow"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

// Cap the stagger so a large result set doesn't produce a multi-second cascade.
const MAX_STAGGER_DELAY_MS = 400
const STAGGER_STEP_MS = 40

// Stable reference for "no tags" — `catTags.get(id) ?? []` would otherwise
// hand back a brand-new empty array every render, defeating memoization for
// every untagged cat's icon (see CatMarker below).
const NO_TAGS: CatTag['tag'][] = []

type WelfareStyle = {
  borderColor: string
  badge: { color: string; glyph: string; pulse: boolean } | null
  desaturate: boolean
}

// Marker-specific wrapper around the shared welfare tier lookup: markers additionally
// pulse for needs-medical (it's the one tag that calls for someone to act soon) and
// have no badge at all for deceased (muted, informational — see getWelfareTier).
function getWelfareStyle(tags: CatTag['tag'][]): WelfareStyle {
  const tier = getWelfareTier(tags)
  if (!tier) {
    return { borderColor: DEFAULT_WELFARE_COLOR, badge: null, desaturate: false }
  }
  return {
    borderColor: tier.color,
    badge: tier.glyph
      ? { color: tier.color, glyph: tier.glyph, pulse: tier.tag === 'needs_medical' }
      : null,
    desaturate: tier.desaturate,
  }
}

function welfareBadgeHtml(badge: WelfareStyle['badge'], size: number): string {
  if (!badge) return ''
  const offset = -(size * 0.2)
  const pulseClass = badge.pulse ? 'map-badge-pulse' : ''
  return `
    <div class="${pulseClass}" style="
      position:absolute;
      top:${offset}px;
      right:${offset}px;
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      background:${badge.color};
      border:2px solid #fff;
      box-shadow:0 1px 3px rgba(0,0,0,0.3);
      display:flex;
      align-items:center;
      justify-content:center;
      color:#fff;
      font-size:${Math.round(size * 0.6)}px;
      font-weight:700;
      line-height:1;
    ">${badge.glyph}</div>
  `
}

// Dot color for the active marker's freshness caption — a fixed palette
// (not theme-derived) so it reads the same over both light and dark map tiles.
const STALENESS_DOT_COLOR: Record<StalenessTier, string> = {
  fresh: '#22c55e',
  aging: '#f59e0b',
  stale: '#94a3b8',
}

const CLUSTER_PHOTO_OFFSETS = [
  { top: 2, left: 2, z: 3 },
  { top: 12, left: 12, z: 2 },
  { top: 22, left: 22, z: 1 },
]

// Cluster bubble: a clipped-circle stack of up to 3 member photos (fanned
// diagonally) plus a count badge, so a cluster reads as "a pile of cats"
// rather than a plain counter — matches the photo-forward pin style used
// everywhere else on the map. Welfare urgency is computed by flattening every
// member cat's tags into one list and running the existing priority logic
// (getWelfareStyle) over it, so a single needs_medical cat inside a cluster
// of 20 still surfaces the same red ring/pulse an individual pin would show.
function makeClusterIcon(
  point: Extract<MapPoint, { type: 'cluster' }>,
  catTags: Map<string, CatTag['tag'][]>
): L.DivIcon {
  const allTags = point.cats.flatMap((cat) => catTags.get(cat.id) ?? NO_TAGS)
  const welfare = getWelfareStyle(allTags)
  const photoFilter = welfare.desaturate ? 'filter:grayscale(1) opacity(0.75);' : ''

  const photosHtml = point.cats
    .slice(0, 3)
    .map((cat, i) => {
      const encodedUrl = cat.primary_photo_url.replace(/'/g, '%27').replace(/"/g, '%22')
      const { top, left, z } = CLUSTER_PHOTO_OFFSETS[i]
      return `
        <div style="
          position:absolute;
          top:${top}px;
          left:${left}px;
          width:26px;
          height:26px;
          border-radius:50%;
          border:1.5px solid #fff;
          background-image:url('${encodedUrl}');
          background-size:cover;
          background-position:center;
          z-index:${z};
          ${photoFilter}
        "></div>
      `
    })
    .join('')

  const countLabel = point.count > 99 ? '99+' : String(point.count)

  const html = `
    <div class="map-marker-pop" style="position:relative;width:52px;height:52px;">
      <div style="
        position:relative;
        width:52px;
        height:52px;
        border-radius:50%;
        border:2.5px solid ${welfare.borderColor};
        background:#fff;
        overflow:hidden;
        isolation:isolate;
        box-shadow:0 2px 6px rgba(0,0,0,0.2);
      ">${photosHtml}</div>
      ${welfareBadgeHtml(welfare.badge, 18)}
      <div style="
        position:absolute;
        bottom:-2px;
        right:-2px;
        min-width:20px;
        height:20px;
        padding:0 4px;
        border-radius:9999px;
        background:#f97316;
        color:#fff;
        font-size:10px;
        font-weight:700;
        display:flex;
        align-items:center;
        justify-content:center;
        border:2px solid #fff;
        box-shadow:0 1px 3px rgba(0,0,0,0.3);
      ">${countLabel}</div>
    </div>
  `
  return L.divIcon({ className: '', html, iconSize: [52, 52], iconAnchor: [26, 26] })
}

/**
 * Builds a per-cat divIcon.
 *
 * Inactive: 44×44 circle with the cat photo as background, orange border.
 * Active:   64×64 rounded-square with the cat photo + name label below.
 *           The icon anchor shifts so the marker point stays at the cat's
 *           lat/lng (bottom-centre of the whole icon block).
 *
 * Both variants play a bounce-in animation on mount — react-leaflet remounts
 * the icon's DOM node whenever `icon` changes, so this also covers the
 * inactive↔active swap for free. The active variant settles lifted
 * (translateY) instead of flat; both variants squish slightly on press for
 * tap feedback.
 *
 * Welfare tags (`needs_medical`, `possible_rabies`, `deceased`) override the
 * default orange border with a color-coded border + badge — see
 * `getWelfareStyle` for the priority order.
 */
function makeCatIcon(
  cat: NearbyCat,
  selected: boolean,
  index: number,
  tags: CatTag['tag'][]
): L.DivIcon {
  const photoUrl = cat.primary_photo_url
  // Escape quote characters only — encodeURIComponent would mangle the
  // `:` and `/` in the URL itself, breaking image loading. We just need to
  // stop the URL from breaking out of the CSS url('...') / the surrounding
  // double-quoted style attribute.
  const encodedUrl = photoUrl.replace(/'/g, '%27').replace(/"/g, '%22')
  const delayMs = Math.min(index * STAGGER_STEP_MS, MAX_STAGGER_DELAY_MS)
  const welfare = getWelfareStyle(tags)
  const photoFilter = welfare.desaturate ? 'filter:grayscale(1) opacity(0.75);' : ''
  // A pin marks where a cat was last tagged, not where it is now — fade older
  // *unselected* pins so that's visible at a glance without shrinking (and
  // hurting tap targets for) markers on a crowded map.
  const stalenessOpacity = getStalenessOpacity(cat.created_at)

  if (selected) {
    const label = cat.name ?? 'Unknown'
    const tier = getStalenessTier(cat.created_at)
    const lastSeen = formatLastSeen(cat.created_at)
    // Photo stays fully opaque even when stale — staleness on the active pin
    // is shown via the dot + relative-time caption below, not by fading the
    // one marker the user is currently looking at.
    // 64×64 photo square + ~20px name pill + ~18px caption pill = ~110px total
    const html = `
      <div class="map-marker-pop-active" style="animation-delay:${delayMs}ms;display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="position:relative;width:64px;height:64px;">
          <div style="
            width:64px;
            height:64px;
            border-radius:10px;
            border:3px solid ${welfare.borderColor};
            background-image:url('${encodedUrl}');
            background-size:cover;
            background-position:center;
            box-shadow:0 4px 16px rgba(0,0,0,0.25);
            ${photoFilter}
          "></div>
          ${welfareBadgeHtml(welfare.badge, 22)}
        </div>
        <span style="
          background:#f97316;
          color:#fff;
          font-size:11px;
          font-weight:600;
          padding:2px 7px;
          border-radius:9999px;
          white-space:nowrap;
          box-shadow:0 1px 4px rgba(0,0,0,0.25);
          max-width:96px;
          overflow:hidden;
          text-overflow:ellipsis;
        ">${label}</span>
        <span style="
          display:flex;
          align-items:center;
          gap:4px;
          background:var(--popover);
          color:var(--popover-foreground);
          font-size:10px;
          font-weight:500;
          padding:2px 7px;
          border-radius:9999px;
          white-space:nowrap;
          box-shadow:0 1px 4px rgba(0,0,0,0.25);
        "><span style="width:6px;height:6px;border-radius:50%;background:${STALENESS_DOT_COLOR[tier]};flex-shrink:0;"></span>${lastSeen}</span>
      </div>
    `
    return L.divIcon({
      className: '',
      html,
      // total block is ~110px tall, 96px wide; anchor at bottom-centre of photo (not the labels)
      iconSize: [96, 110],
      iconAnchor: [48, 67],
    })
  }

  // Inactive: 44×44 circle (WCAG minimum touch target)
  const html = `
    <div class="map-marker-pop" style="position:relative;width:44px;height:44px;animation-delay:${delayMs}ms;opacity:${stalenessOpacity};">
      <div style="
        width:44px;
        height:44px;
        border-radius:50%;
        border:2.5px solid ${welfare.borderColor};
        background-image:url('${encodedUrl}');
        background-size:cover;
        background-position:center;
        box-shadow:0 2px 6px rgba(0,0,0,0.2);
        ${photoFilter}
      "></div>
      ${welfareBadgeHtml(welfare.badge, 18)}
    </div>
  `
  return L.divIcon({
    className: '',
    html,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
}

function MapEvents({
  onMoveEnd,
  onUserDrag,
}: {
  onMoveEnd: (move: MapMoveEnd) => void
  onUserDrag?: () => void
}) {
  useMapEvents({
    moveend(e) {
      const map = e.target
      const center = map.getCenter()
      const radiusKm = center.distanceTo(map.getBounds().getNorthEast()) / 1000
      onMoveEnd({ lat: center.lat, lng: center.lng, radiusKm })
    },
    // Only fires on real user-initiated drag, never from our own programmatic
    // `flyTo` calls — the clean way to tell "I moved the map" apart from
    // "the user grabbed the map" (used to break out of location-following mode).
    dragstart() {
      onUserDrag?.()
    },
  })
  return null
}

// MapContainer's `center` prop only sets the initial view — it isn't synced on
// updates, so panning programmatically (e.g. after picking a search result)
// needs this instead.
function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target, 15)
  }, [target, map])
  return null
}

type ClusterViewport = { bounds: L.LatLngBounds; zoom: number }

// Recomputes clusters only when a pan/zoom gesture settles (moveend), not on
// every intermediate animation frame — matches how cat data itself only
// refetches at moveend (see page.tsx's onMoveEnd), and avoids cluster
// bubbles visibly thrashing mid-gesture.
function ClusterViewportTracker({ onChange }: { onChange: (viewport: ClusterViewport) => void }) {
  const map = useMapEvents({
    moveend() {
      onChange({ bounds: map.getBounds(), zoom: map.getZoom() })
    },
  })
  useEffect(() => {
    onChange({ bounds: map.getBounds(), zoom: map.getZoom() })
  }, [map, onChange])
  return null
}

// Memoizes its own icon rather than sharing one combined map across all
// markers — selecting/deselecting one cat must not rebuild (and thus
// remount + re-animate) every other marker on the map. See the root-cause
// note on CatMap's previous `catIcons` useMemo for why that mattered.
function CatMarker({
  cat,
  lat,
  lng,
  index,
  selectedCatId,
  tags,
  onSelectCat,
}: {
  cat: NearbyCat
  lat: number
  lng: number
  index: number
  selectedCatId: string | null
  tags: CatTag['tag'][]
  onSelectCat: (cat: NearbyCat) => void
}) {
  const selected = cat.id === selectedCatId
  const icon = useMemo(() => makeCatIcon(cat, selected, index, tags), [cat, selected, index, tags])

  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      opacity={selectedCatId && !selected ? 0.55 : 1}
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{ click: () => onSelectCat(cat) }}
    />
  )
}

// Tapping a cluster always zooms in to break it apart — no list/preview view
// (see design spec). getClusterExpansionZoom was already computed for this
// exact point in lib/clustering.ts, straight off the same index, so it's safe
// to fly to directly here without re-querying the index.
function ClusterMarker({
  point,
  catTags,
  dimmed,
}: {
  point: Extract<MapPoint, { type: 'cluster' }>
  catTags: Map<string, CatTag['tag'][]>
  dimmed: boolean
}) {
  const map = useMap()
  const icon = useMemo(() => makeClusterIcon(point, catTags), [point, catTags])

  return (
    <Marker
      position={[point.lat, point.lng]}
      icon={icon}
      opacity={dimmed ? 0.55 : 1}
      eventHandlers={{ click: () => map.flyTo([point.lat, point.lng], point.expansionZoom) }}
    />
  )
}

export function CatMap({
  center,
  userLocation,
  cats,
  catTags,
  selectedCatId,
  onSelectCat,
  onMoveEnd,
  onUserDrag,
  flyTo = null,
}: {
  center: [number, number]
  userLocation: [number, number]
  cats: NearbyCat[]
  catTags: Map<string, CatTag['tag'][]>
  selectedCatId: string | null
  onSelectCat: (cat: NearbyCat) => void
  onMoveEnd: (move: MapMoveEnd) => void
  onUserDrag?: () => void
  flyTo?: [number, number] | null
}) {
  const { resolvedTheme } = useTheme()

  const [clusterViewport, setClusterViewport] = useState<ClusterViewport | null>(null)
  const clusterIndex = useMemo(() => buildClusterIndex(cats), [cats])
  const points = useMemo<MapPoint[]>(() => {
    const raw: MapPoint[] = !clusterViewport
      ? cats.map((cat): MapPoint => ({ type: 'single', cat, lat: cat.lat, lng: cat.lng }))
      : getMapPoints(clusterIndex, clusterViewport.bounds, clusterViewport.zoom)
    return separateOverlappingCats(raw)
  }, [cats, clusterIndex, clusterViewport])

  return (
    <MapContainer
      center={center}
      zoom={15}
      className="isolate h-full w-full"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url={TILE_URL}
        className={resolvedTheme === 'dark' ? 'map-tiles-dark' : undefined}
      />
      <MapEvents onMoveEnd={onMoveEnd} onUserDrag={onUserDrag} />
      <ClusterViewportTracker onChange={setClusterViewport} />
      <FlyTo target={flyTo} />
      <Marker position={userLocation} icon={userIcon} />
      {points.map((point, index) =>
        point.type === 'single' ? (
          <CatMarker
            key={point.cat.id}
            cat={point.cat}
            lat={point.lat}
            lng={point.lng}
            index={index}
            selectedCatId={selectedCatId}
            tags={catTags.get(point.cat.id) ?? NO_TAGS}
            onSelectCat={onSelectCat}
          />
        ) : (
          <ClusterMarker
            key={`cluster-${point.id}`}
            point={point}
            catTags={catTags}
            dimmed={selectedCatId !== null}
          />
        )
      )}
    </MapContainer>
  )
}
