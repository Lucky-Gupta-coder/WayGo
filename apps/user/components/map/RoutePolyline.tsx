'use client'

import { useEffect, useRef, useMemo } from 'react'
import L from 'leaflet'
import { useLeafletMap } from './LeafletMapContext'
import { decodePolyline } from '@/lib/polyline'

interface RoutePolylineProps {
  encoded?: string
  positions?: [number, number][]
  variant?: 'default' | 'pickup-leg' | 'traveled-backdrop'
}

export default function RoutePolyline({ encoded, positions, variant = 'default' }: RoutePolylineProps) {
  const map = useLeafletMap()
  const polylineRef = useRef<L.Polyline | null>(null)
  const casingRef = useRef<L.Polyline | null>(null)

  const pts = useMemo<[number, number][]>(() => {
    if (encoded) return decodePolyline(encoded)
    if (positions && positions.length >= 2) return positions
    return []
  }, [encoded, positions])

  useEffect(() => {
    if (!map || pts.length < 2) return

    const latLngs = pts.map(([lat, lng]) => L.latLng(lat, lng))

    if (variant === 'traveled-backdrop') {
      const line = L.polyline(latLngs, {
        color: '#CBD5E1',
        weight: 5,
        opacity: 0.55,
      }).addTo(map)
      polylineRef.current = line
      return () => {
        line.remove()
        polylineRef.current = null
      }
    }

    if (variant === 'pickup-leg') {
      const casing = L.polyline(latLngs, {
        color: '#ffffff',
        weight: 6,
        opacity: 0.6,
      }).addTo(map)
      const line = L.polyline(latLngs, {
        color: '#64748B',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 8',
      }).addTo(map)
      casingRef.current = casing
      polylineRef.current = line
      return () => {
        casing.remove()
        line.remove()
        casingRef.current = null
        polylineRef.current = null
      }
    }

    // Default variant: white casing border + vivid blue line
    const casing = L.polyline(latLngs, {
      color: '#ffffff',
      weight: 9,
      opacity: 0.9,
    }).addTo(map)
    const line = L.polyline(latLngs, {
      color: '#1A73E8',
      weight: 5,
      opacity: 1,
    }).addTo(map)
    casingRef.current = casing
    polylineRef.current = line

    return () => {
      casing.remove()
      line.remove()
      casingRef.current = null
      polylineRef.current = null
    }
  }, [map, pts, variant])

  return null
}
