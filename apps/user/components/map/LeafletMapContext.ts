'use client'

import { createContext, useContext } from 'react'
import type L from 'leaflet'

export const LeafletMapContext = createContext<L.Map | null>(null)

export function useLeafletMap(): L.Map | null {
  return useContext(LeafletMapContext)
}
