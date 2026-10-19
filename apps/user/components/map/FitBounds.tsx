'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useLeafletMap } from './LeafletMapContext'

interface FitBoundsProps {
  positions: [number, number][]
  padding?: [number, number]
  paddingBottom?: number
}

const MAX_FIT_ZOOM = 17

export default function FitBounds({ positions, padding = [56, 56], paddingBottom = 40 }: FitBoundsProps) {
  const map = useLeafletMap()
  const key = positions.map(p => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join('|')
  const lastKey = useRef('')

  useEffect(() => {
    if (!map || positions.length < 2 || key === lastKey.current) return
    lastKey.current = key

    const latLngs = positions.map(([lat, lng]) => L.latLng(lat, lng))
    const bounds = L.latLngBounds(latLngs)

    map.fitBounds(bounds, {
      paddingTopLeft: [padding[0], padding[1]],
      paddingBottomRight: [padding[0], padding[1] + paddingBottom],
      maxZoom: MAX_FIT_ZOOM,
      animate: true,
    })
  }, [key, map, padding, paddingBottom, positions])

  return null
}
