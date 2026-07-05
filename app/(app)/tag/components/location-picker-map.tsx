'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

const orangePinIcon = L.divIcon({
  className: '',
  html: `<div style="
    position:relative;
    width:32px;
    height:32px;
  ">
    <div style="
      width:24px;
      height:24px;
      border-radius:50% 50% 50% 0;
      background:#f97316;
      border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      transform:rotate(-45deg);
      position:absolute;
      top:0;
      left:4px;
    "></div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
})

function DraggableMarker({
  position,
  onMove,
}: {
  position: [number, number]
  onMove: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng)
    },
  })

  return (
    <Marker
      position={position}
      icon={orangePinIcon}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target
          const { lat, lng } = marker.getLatLng()
          onMove(lat, lng)
        },
      }}
    />
  )
}

export function LocationPickerMap({
  initialLat,
  initialLng,
  onChange,
}: {
  initialLat: number
  initialLng: number
  onChange: (lat: number, lng: number) => void
}) {
  const { resolvedTheme } = useTheme()
  const [position, setPosition] = useState<[number, number]>([initialLat, initialLng])

  function handleMove(lat: number, lng: number) {
    setPosition([lat, lng])
    onChange(lat, lng)
  }

  return (
    <div className="border-border h-64 w-full overflow-hidden rounded-xl border shadow-sm">
      <MapContainer center={position} zoom={16} className="h-full w-full" zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={TILE_URL}
          className={resolvedTheme === 'dark' ? 'map-tiles-dark' : undefined}
        />
        <DraggableMarker position={position} onMove={handleMove} />
      </MapContainer>
    </div>
  )
}
