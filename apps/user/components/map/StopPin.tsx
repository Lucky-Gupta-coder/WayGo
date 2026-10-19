'use client'

import { useEffect, useRef, memo } from 'react'
import L from 'leaflet'
import { useLeafletMap } from './LeafletMapContext'

interface StopPinProps {
  position: [number, number]
  index: number
  onClick?: () => void
  selected?: boolean
}

function createStopPinHtml(index: number, selected: boolean, clickable: boolean) {
  return `
    <div style="
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #DC3E93;
      border: 2px solid white;
      box-shadow: ${selected ? '0 0 0 3px rgba(220, 62, 147, 0.40), 0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.3)'};
      transform: ${selected ? 'scale(1.22)' : 'scale(1)'};
      transition: transform 160ms ease, box-shadow 160ms ease;
      cursor: ${clickable ? 'pointer' : 'default'};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: white;
      font-family: inherit;
    ">
      ${index}
    </div>
  `
}

function StopPin({ position, index, onClick, selected = false }: StopPinProps) {
  const map = useLeafletMap()
  const markerRef = useRef<L.Marker | null>(null)
  const onClickRef = useRef(onClick)
  onClickRef.current = onClick

  useEffect(() => {
    if (!map) return

    const icon = L.divIcon({
      className: 'stop-pin-container',
      html: createStopPinHtml(index, selected, !!onClick),
      iconSize: [26, 26],
      iconAnchor: [13, 13], // Center anchor on the waypoint coordinate
    })

    const marker = L.marker([position[0], position[1]], { icon, zIndexOffset: 950 }).addTo(map)
    markerRef.current = marker

    marker.on('click', () => {
      onClickRef.current?.()
    })

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
    const icon = L.divIcon({
      className: 'stop-pin-container',
      html: createStopPinHtml(index, selected, !!onClick),
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    })
    markerRef.current.setIcon(icon)
  }, [index, selected, onClick])

  return null
}

export default memo(StopPin, (a, b) =>
  a.index === b.index &&
  a.selected === b.selected &&
  a.onClick === b.onClick &&
  a.position[0] === b.position[0] &&
  a.position[1] === b.position[1]
)
