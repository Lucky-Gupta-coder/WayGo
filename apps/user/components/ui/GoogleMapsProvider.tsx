'use client'

import React from 'react'

/**
 * No-op provider now that Google Maps APIProvider is no longer needed.
 * Kept to preserve layout hierarchy without breaking existing routes.
 */
export default function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
