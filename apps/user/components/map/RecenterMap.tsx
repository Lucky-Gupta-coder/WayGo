'use client'

import { useEffect, useRef } from 'react'
import { useLeafletMap } from './LeafletMapContext'

interface RecenterMapProps {
  center: [number, number]
  animate?: boolean
  /** Rotates the map to match the driver's heading — ignored in standard Leaflet */
  heading?: number
  headingKnown?: boolean
}

export default function RecenterMap({ center, animate = true }: RecenterMapProps) {
  const map = useLeafletMap()
  const last = useRef<[number, number] | null>(null)

  useEffect(() => {
    if (!map) return
    const [lat, lng] = center
    const prev = last.current
    const moved = !prev || Math.abs(prev[0] - lat) >= 2e-5 || Math.abs(prev[1] - lng) >= 2e-5

    if (!moved) return
    last.current = [lat, lng]

    if (animate) {
      map.panTo([lat, lng], { animate: true, duration: 0.5 })
    } else {
      map.setView([lat, lng])
    }
  }, [center, map, animate])

  return null
}
