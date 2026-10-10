"use client"

import { useEffect, useRef } from "react"
import { Marker, type MapRef } from "react-map-gl/maplibre"

import { BaseMap, DEFAULT_VIEW } from "@/components/shared/map/base-map"
import { LocationPin } from "@/components/shared/map/pins"
import type { Coords } from "@/lib/photo-location"

const PICK_ZOOM = 16

/**
 * Small map in the entry form: a draggable pin, or tap the map to drop it.
 * Default export so the form can `next/dynamic` it (MapLibre is client-only).
 */
export default function LocationPicker({
  value,
  onChange,
  className,
}: {
  value: Coords | null
  onChange: (c: Coords) => void
  className?: string
}) {
  const mapRef = useRef<MapRef>(null)
  // The last position this map produced itself, so it doesn't fly to its own drag.
  const own = useRef<Coords | null>(null)

  // A position set elsewhere (photo EXIF, device GPS) moves the camera to it.
  useEffect(() => {
    if (!value || (own.current?.lat === value.lat && own.current.lng === value.lng)) return
    mapRef.current?.flyTo({ center: [value.lng, value.lat], zoom: Math.max(mapRef.current.getZoom(), PICK_ZOOM), duration: 600 })
  }, [value])

  function emit(lng: number, lat: number) {
    const c = { lat, lng }
    own.current = c
    onChange(c)
  }

  return (
    <BaseMap
      ref={mapRef}
      className={className}
      initialViewState={value ? { longitude: value.lng, latitude: value.lat, zoom: PICK_ZOOM } : DEFAULT_VIEW}
      onClick={(e) => emit(e.lngLat.lng, e.lngLat.lat)}
      cursor="crosshair"
    >
      {value && (
        <Marker
          longitude={value.lng}
          latitude={value.lat}
          anchor="bottom"
          draggable
          onDragEnd={(e) => emit(e.lngLat.lng, e.lngLat.lat)}
        >
          <LocationPin />
        </Marker>
      )}
    </BaseMap>
  )
}
