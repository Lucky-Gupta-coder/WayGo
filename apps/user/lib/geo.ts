/** Compass bearing (0-360°) from point `a` to point `b`. */
export function bearingDeg(a: [number, number], b: [number, number]): number {
  const lat1 = a[0] * Math.PI / 180
  const lat2 = b[0] * Math.PI / 180
  const dLng = (b[1] - a[1]) * Math.PI / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

/** Great-circle distance in metres between two [lat, lng] points. */
export function haversineMetres(a: [number, number], b: [number, number]): number {
  const R = 6_371_000
  const dLat = (b[0] - a[0]) * Math.PI / 180
  const dLng = (b[1] - a[1]) * Math.PI / 180
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

export interface NearestPointResult {
  point: [number, number]
  distMetres: number
  segmentIndex: number
}

/**
 * Projects `p` onto the nearest point of a polyline (ordered [lat,lng] list), using a
 * local equirectangular (flat-plane) approximation centred on `p` — accurate to well
 * under a metre at city/highway scale, so a full geodesic library isn't needed here.
 *
 * Ported from apps/driver/src/lib/geo.ts — kept identical since both apps snap a
 * driver GPS fix to the same kind of route geometry (see
 * docs/DRIVER_USER_MAP_UX_FIX_PLAN.md Phase 2). No shared `packages/` runtime code
 * exists yet in this repo, so this duplication matches the existing per-app pattern.
 */
export function nearestPointOnPolyline(
  p: [number, number],
  polyline: [number, number][],
): NearestPointResult | null {
  if (polyline.length === 0) return null
  if (polyline.length === 1) {
    return { point: polyline[0]!, distMetres: haversineMetres(p, polyline[0]!), segmentIndex: 0 }
  }

  const R = 6_371_000
  const lat0 = p[0] * Math.PI / 180
  const toXY = ([lat, lng]: [number, number]): [number, number] => [
    (lng * Math.PI / 180) * R * Math.cos(lat0),
    (lat * Math.PI / 180) * R,
  ]
  const fromXY = ([x, y]: [number, number]): [number, number] => [
    (y / R) * 180 / Math.PI,
    (x / (R * Math.cos(lat0))) * 180 / Math.PI,
  ]

  const px = toXY(p)
  let best: NearestPointResult | null = null

  for (let i = 0; i < polyline.length - 1; i++) {
    const a = toXY(polyline[i]!)
    const b = toXY(polyline[i + 1]!)
    const abx = b[0] - a[0]
    const aby = b[1] - a[1]
    const lenSq = abx * abx + aby * aby
    let t = lenSq === 0 ? 0 : ((px[0] - a[0]) * abx + (px[1] - a[1]) * aby) / lenSq
    t = Math.max(0, Math.min(1, t))
    const projX = a[0] + abx * t
    const projY = a[1] + aby * t
    const dist = Math.hypot(px[0] - projX, px[1] - projY)
    if (!best || dist < best.distMetres) {
      best = { point: fromXY([projX, projY]), distMetres: dist, segmentIndex: i }
    }
  }

  return best
}

/** Validates whether a given latitude/longitude pair represents a real, non-null, in-range coordinate. */
export function isValidCoordinate(pos: [number, number] | null | undefined): pos is [number, number] {
  if (!pos || !Array.isArray(pos) || pos.length !== 2) return false
  const [lat, lng] = pos
  if (typeof lat !== 'number' || typeof lng !== 'number') return false
  if (isNaN(lat) || isNaN(lng)) return false
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

export type RouteMode = 'pickup-dest' | 'driver-pickup' | 'driver-dest' | 'returning' | 'recap'

export interface RouteEndpoints {
  origin: [number, number]
  dest: [number, number]
}

/**
 * Determines the correct navigation origin and destination for a given route mode.
 * Crucially, during 'driver-pickup', the destination is ALWAYS the contracted pickup point
 * (pickupPos), NEVER the passenger device's live position (userPos), which could be in a
 * completely different city or fluctuating on Wi-Fi/IP location.
 */
export function determineRouteEndpoints(
  mode: RouteMode,
  endpoints: {
    pickupPos: [number, number]
    dropPos?: [number, number] | null
    driverPos?: [number, number] | null
    hasDropPos: boolean
  },
): RouteEndpoints | null {
  const { pickupPos, dropPos, driverPos, hasDropPos } = endpoints

  if (mode === 'driver-pickup') {
    if (!driverPos) return null
    return { origin: driverPos, dest: pickupPos }
  }

  if (mode === 'returning') {
    if (!driverPos) return null
    return { origin: driverPos, dest: pickupPos }
  }

  if (mode === 'driver-dest') {
    if (!driverPos || !hasDropPos || !dropPos) return null
    return { origin: driverPos, dest: dropPos }
  }

  // pickup-dest (searching or fixed preview)
  if (!hasDropPos || !dropPos) return null
  return { origin: pickupPos, dest: dropPos }
}

/** Maximum realistic distance (in km) for a driver-to-pickup dispatch leg within a city. */
export const MAX_DISPATCH_DISTANCE_KM = 100

/**
 * Validates whether an estimated distance is realistic for the leg.
 * E.g., if a driver-to-pickup route claims 1600+ km across states, it indicates mismatched coordinates.
 */
export function isValidDispatchDistance(distanceKm: number, maxAllowedKm = MAX_DISPATCH_DISTANCE_KM): boolean {
  return distanceKm >= 0 && distanceKm <= maxAllowedKm
}

/**
 * Ticks ETA down every second between server refreshes while maintaining rate consistency.
 */
export function computeTickedEta(
  liveEta: { etaMin: number; distanceKm: number } | null,
  liveEtaAt: number | null,
  nowMs: number,
): { etaMin: number; distanceKm: number } | null {
  if (!liveEta || liveEtaAt == null || nowMs <= 0) return liveEta
  const rateKmPerMin = liveEta.etaMin > 0 ? liveEta.distanceKm / liveEta.etaMin : 0
  const elapsedMin = Math.max(0, (nowMs - liveEtaAt) / 60_000)
  return {
    etaMin: Math.max(0, Math.round(liveEta.etaMin - elapsedMin)),
    distanceKm: Math.max(0, Math.round((liveEta.distanceKm - rateKmPerMin * elapsedMin) * 10) / 10),
  }
}

