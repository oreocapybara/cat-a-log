'use client'

import { useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
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
      icon={markerIcon}
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
  const [position, setPosition] = useState<[number, number]>([initialLat, initialLng])

  function handleMove(lat: number, lng: number) {
    setPosition([lat, lng])
    onChange(lat, lng)
  }

  return (
    <div className="border-border h-64 w-full overflow-hidden rounded-lg border">
      <MapContainer center={position} zoom={16} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DraggableMarker position={position} onMove={handleMove} />
      </MapContainer>
    </div>
  )
}
