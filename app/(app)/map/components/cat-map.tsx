'use client'

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { NearbyCat } from '@/lib/supabase/types'

export type MapMoveEnd = { lat: number; lng: number; radiusKm: number }

const catIcon = L.divIcon({
  className: '',
  html: '<span class="bg-primary block h-3.5 w-3.5 rounded-full border-2 border-white shadow"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

const userIcon = L.divIcon({
  className: '',
  html: '<span class="block h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-500 shadow"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

function MapEvents({ onMoveEnd }: { onMoveEnd: (move: MapMoveEnd) => void }) {
  useMapEvents({
    moveend(e) {
      const map = e.target
      const center = map.getCenter()
      const radiusKm = center.distanceTo(map.getBounds().getNorthEast()) / 1000
      onMoveEnd({ lat: center.lat, lng: center.lng, radiusKm })
    },
  })
  return null
}

export function CatMap({
  center,
  cats,
  selectedCatId,
  onSelectCat,
  onMoveEnd,
}: {
  center: [number, number]
  cats: NearbyCat[]
  selectedCatId: string | null
  onSelectCat: (cat: NearbyCat) => void
  onMoveEnd: (move: MapMoveEnd) => void
}) {
  return (
    <MapContainer center={center} zoom={15} className="h-full w-full" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapEvents onMoveEnd={onMoveEnd} />
      <Marker position={center} icon={userIcon} />
      {cats.map((cat) => (
        <Marker
          key={cat.id}
          position={[cat.lat, cat.lng]}
          icon={catIcon}
          opacity={selectedCatId && selectedCatId !== cat.id ? 0.6 : 1}
          eventHandlers={{ click: () => onSelectCat(cat) }}
        />
      ))}
    </MapContainer>
  )
}
