'use client'

import { useEffect, useRef } from 'react'
import { useLeafletMap } from './LeafletMapContext'

interface MapCenterTrackerProps {
  onCenterChange: (lat: number, lng: number) => void
  onDragStart?: () => void
}

export default function MapCenterTracker({ onCenterChange, onDragStart }: MapCenterTrackerProps) {
  const map = useLeafletMap()
  const onCenterChangeRef = useRef(onCenterChange)
  onCenterChangeRef.current = onCenterChange
  const onDragStartRef = useRef(onDragStart)
  onDragStartRef.current = onDragStart

  useEffect(() => {
    if (!map) return

    const handleDragStart = () => {
      onDragStartRef.current?.()
    }

    const handleMoveEnd = () => {
      const c = map.getCenter()
      onCenterChangeRef.current(c.lat, c.lng)
    }

    map.on('dragstart', handleDragStart)
    map.on('moveend', handleMoveEnd)

    return () => {
      map.off('dragstart', handleDragStart)
      map.off('moveend', handleMoveEnd)
    }
  }, [map])

  return null
}
