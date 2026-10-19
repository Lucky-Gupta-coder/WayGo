'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useLeafletMap } from './LeafletMapContext'

interface BreadcrumbTrailProps {
  positions: [number, number][]
}

export default function BreadcrumbTrail({ positions }: BreadcrumbTrailProps) {
  const map = useLeafletMap()
  const lineRef = useRef<L.Polyline | null>(null)

  useEffect(() => {
    if (!map || positions.length < 2) return

    const latLngs = positions.map(([lat, lng]) => L.latLng(lat, lng))
    const line = L.polyline(latLngs, {
      color: '#94A3B8',
      weight: 3,
      opacity: 0.55,
    }).addTo(map)
    lineRef.current = line

    return () => {
      line.remove()
      lineRef.current = null
    }
  }, [map, positions])

  return null
}
