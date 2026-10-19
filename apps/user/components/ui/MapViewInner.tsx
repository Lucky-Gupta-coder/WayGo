'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LeafletMapContext } from '@/components/map/LeafletMapContext'

// Odisha bounds matching the previous Google Maps restriction
const ODISHA_BOUNDS = L.latLngBounds([17.5, 82.0], [23.0, 88.5])

// Desaturate + slightly brighten the map so terrain colours don't dominate.
// Roads and labels remain sharp, giving a clean minimal look.
const MAP_FILTER = 'saturate(0.6) brightness(1.04) contrast(0.96)'

interface MapViewInnerProps {
  center: [number, number]
  zoom: number
  className?: string
  children?: React.ReactNode
}

export default function MapViewInner({ center, zoom, className, children }: MapViewInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: true,
      maxBounds: ODISHA_BOUNDS.pad(0.1),
      maxBoundsViscosity: 0.8,
    })

    // OpenStreetMap standard tile layer with proper attribution
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map)

    mapRef.current = map
    setMapInstance(map)

    // Ensure map container renders properly after DOM attachment
    setTimeout(() => {
      map.invalidateSize()
    }, 100)

    return () => {
      map.remove()
      mapRef.current = null
      setMapInstance(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className={className ?? 'w-full h-full'}
      style={{ height: '100%', width: '100%', position: 'relative' }}
    >
      <div
        ref={containerRef}
        style={{ height: '100%', width: '100%', filter: MAP_FILTER }}
      />
      {mapInstance && (
        <LeafletMapContext.Provider value={mapInstance}>
          {children}
        </LeafletMapContext.Provider>
      )}
    </div>
  )
}
