'use client'

import { useEffect, useRef, memo } from 'react'
import L from 'leaflet'
import { useLeafletMap } from './LeafletMapContext'

type PinVariant = 'pickup' | 'drop' | 'user'

interface LocationPinProps {
  position: [number, number]
  variant: PinVariant
}

function createPinHtml(variant: PinVariant): { html: string; size: [number, number]; anchor: [number, number] } {
  if (variant === 'user') {
    const html = `
      <div style="position: relative; width: 20px; height: 20px;">
        <div style="position: absolute; inset: 0; border-radius: 9999px; background: rgba(37,99,235,0.3); animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position: relative; width: 20px; height: 20px; border-radius: 9999px; background: #2563EB; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
      </div>
      <style>
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      </style>
    `
    return { html, size: [20, 20], anchor: [10, 10] }
  }

  const isPickup = variant === 'pickup'
  const fill = isPickup ? '#16A34A' : '#DC2626'

  const html = `
    <div style="position: relative; width: 28px; height: 38px;">
      ${isPickup ? `
        <div style="
          position: absolute; top: -6px; left: -6px; width: 40px; height: 40px;
          border-radius: 9999px; pointer-events: none;
          background: rgba(22,163,74,0.18);
          animation: ping 1.8s cubic-bezier(0,0,0.2,1) infinite;
        "></div>
      ` : ''}
      <svg width="28" height="38" viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="14" cy="36.5" rx="5" ry="1.5" fill="rgba(0,0,0,0.18)"/>
        <path d="M14 1C6.82 1 1 6.82 1 14C1 21.2 7.4 28.6 14 37C20.6 28.6 27 21.2 27 14C27 6.82 21.18 1 14 1Z" fill="${fill}" stroke="white" stroke-width="2"/>
        <circle cx="14" cy="13.5" r="4.5" fill="white" opacity="0.9"/>
      </svg>
    </div>
    <style>
      @keyframes ping {
        75%, 100% { transform: scale(2); opacity: 0; }
      }
    </style>
  `
  // Anchor at the tip of the pin: bottom-center (14, 37)
  return { html, size: [28, 38], anchor: [14, 37] }
}

function LocationPin({ position, variant }: LocationPinProps) {
  const map = useLeafletMap()
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!map) return

    const { html, size, anchor } = createPinHtml(variant)
    const icon = L.divIcon({
      className: 'location-pin-container',
      html,
      iconSize: size,
      iconAnchor: anchor,
    })

    const marker = L.marker([position[0], position[1]], { icon, zIndexOffset: variant === 'user' ? 800 : 900 }).addTo(map)
    markerRef.current = marker

    return () => {
      marker.remove()
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  useEffect(() => {
    if (!markerRef.current) return
    markerRef.current.setLatLng([position[0], position[1]])
  }, [position])

  useEffect(() => {
    if (!markerRef.current) return
    const { html, size, anchor } = createPinHtml(variant)
    const icon = L.divIcon({
      className: 'location-pin-container',
      html,
      iconSize: size,
      iconAnchor: anchor,
    })
    markerRef.current.setIcon(icon)
  }, [variant])

  return null
}

export default memo(LocationPin, (a, b) =>
  a.variant === b.variant &&
  a.position[0] === b.position[0] &&
  a.position[1] === b.position[1]
)
