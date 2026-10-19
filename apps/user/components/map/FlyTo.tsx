'use client'

import { useEffect } from 'react'
import { useLeafletMap } from './LeafletMapContext'

interface FlyToProps {
  target: [number, number] | null
  zoom?: number
}

export default function FlyTo({ target, zoom = 16 }: FlyToProps) {
  const map = useLeafletMap()

  useEffect(() => {
    if (!map || !target) return
    map.flyTo([target[0], target[1]], zoom, { duration: 0.8 })
  }, [target, zoom, map])

  return null
}
