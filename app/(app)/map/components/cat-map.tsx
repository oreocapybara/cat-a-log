'use client'

import { useEffect, useMemo } from 'react'
import { useTheme } from 'next-themes'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getStalenessOpacity } from '@/lib/geo'
import { DEFAULT_WELFARE_COLOR, getWelfareTier } from '@/lib/welfare-colors'
import type { CatTag, NearbyCat } from '@/lib/supabase/types'

export type MapMoveEnd = { lat: number; lng: number; radiusKm: number }

const TILE_URLS = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
}

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

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
  // pins so that's visible at a glance without shrinking (and hurting tap
  // targets for) markers on a crowded map.
  const stalenessOpacity = getStalenessOpacity(cat.created_at)

  if (selected) {
    const label = cat.name ?? 'Unknown'
    // 64×64 photo square + ~20px label below = ~88px total height
    const html = `
      <div class="map-marker-pop-active" style="animation-delay:${delayMs}ms;opacity:${stalenessOpacity};display:flex;flex-direction:column;align-items:center;gap:4px;">
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
      </div>
    `
    return L.divIcon({
      className: '',
      html,
      // total block is ~88px tall, 96px wide; anchor at bottom-centre of photo (not label)
      iconSize: [96, 88],
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

// Memoizes its own icon rather than sharing one combined map across all
// markers — selecting/deselecting one cat must not rebuild (and thus
// remount + re-animate) every other marker on the map. See the root-cause
// note on CatMap's previous `catIcons` useMemo for why that mattered.
function CatMarker({
  cat,
  index,
  selectedCatId,
  tags,
  onSelectCat,
}: {
  cat: NearbyCat
  index: number
  selectedCatId: string | null
  tags: CatTag['tag'][]
  onSelectCat: (cat: NearbyCat) => void
}) {
  const selected = cat.id === selectedCatId
  const icon = useMemo(() => makeCatIcon(cat, selected, index, tags), [cat, selected, index, tags])

  return (
    <Marker
      position={[cat.lat, cat.lng]}
      icon={icon}
      opacity={selectedCatId && !selected ? 0.55 : 1}
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{ click: () => onSelectCat(cat) }}
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
  const tileUrl = resolvedTheme === 'dark' ? TILE_URLS.dark : TILE_URLS.light

  return (
    <MapContainer center={center} zoom={15} className="isolate h-full w-full" zoomControl={false}>
      <TileLayer attribution={TILE_ATTRIBUTION} url={tileUrl} />
      <MapEvents onMoveEnd={onMoveEnd} onUserDrag={onUserDrag} />
      <FlyTo target={flyTo} />
      <Marker position={userLocation} icon={userIcon} />
      {cats.map((cat, index) => (
        <CatMarker
          key={cat.id}
          cat={cat}
          index={index}
          selectedCatId={selectedCatId}
          tags={catTags.get(cat.id) ?? NO_TAGS}
          onSelectCat={onSelectCat}
        />
      ))}
    </MapContainer>
  )
}
