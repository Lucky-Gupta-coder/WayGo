import { describe, it, expect } from 'vitest'
import {
  haversineMetres,
  determineRouteEndpoints,
  isValidCoordinate,
  isValidDispatchDistance,
  computeTickedEta,
  bearingDeg,
} from '../lib/geo'

describe('Ride ETA and Distance Geo Logic', () => {
  // Bhubaneswar landmarks
  const MASTER_CANTEEN_BBSR: [number, number] = [20.2668, 85.8436]
  const PATIA_BBSR: [number, number] = [20.3540, 85.8190]
  const AIRPORT_BBSR: [number, number] = [20.2526, 85.8178]
  const RAILWAY_STATION_BBSR: [number, number] = [20.2680, 85.8420]

  // Mumbai landmarks (development / laptop Wi-Fi location)
  const ANDHERI_MUMBAI: [number, number] = [19.1197, 72.8468]
  const BANDRA_MUMBAI: [number, number] = [19.0596, 72.8295]

  describe('Haversine distance calculations', () => {
    it('calculates realistic local distance between nearby Bhubaneswar coordinates (< 15 km)', () => {
      // Distance between Master Canteen and Patia in Bhubaneswar is ~10-11 km
      const distanceMetres = haversineMetres(MASTER_CANTEEN_BBSR, PATIA_BBSR)
      const distanceKm = distanceMetres / 1000

      expect(distanceKm).toBeGreaterThan(8)
      expect(distanceKm).toBeLessThan(12)
    })

    it('calculates realistic walking/short distance within Bhubaneswar (< 1 km)', () => {
      // Distance between Master Canteen and Railway Station is ~200-400 metres
      const distanceMetres = haversineMetres(MASTER_CANTEEN_BBSR, RAILWAY_STATION_BBSR)
      expect(distanceMetres).toBeGreaterThan(100)
      expect(distanceMetres).toBeLessThan(500)
    })

    it('produces a large intercity distance between Mumbai and Bhubaneswar (~1300 - 1500 km great-circle)', () => {
      const distanceMetres = haversineMetres(ANDHERI_MUMBAI, MASTER_CANTEEN_BBSR)
      const distanceKm = distanceMetres / 1000

      // Great-circle distance from Mumbai to Bhubaneswar is ~1360 km (road distance is ~1615 km)
      expect(distanceKm).toBeGreaterThan(1300)
      expect(distanceKm).toBeLessThan(1500)
    })

    it('returns 0 for identical coordinates', () => {
      expect(haversineMetres(AIRPORT_BBSR, AIRPORT_BBSR)).toBe(0)
    })
  })

  describe('isValidCoordinate', () => {
    it('accepts valid [lat, lng] within geographic ranges', () => {
      expect(isValidCoordinate(MASTER_CANTEEN_BBSR)).toBe(true)
      expect(isValidCoordinate([0, 0])).toBe(true)
      expect(isValidCoordinate([-90, -180])).toBe(true)
      expect(isValidCoordinate([90, 180])).toBe(true)
    })

    it('rejects invalid or out-of-order/out-of-range coordinates', () => {
      expect(isValidCoordinate(null)).toBe(false)
      expect(isValidCoordinate(undefined)).toBe(false)
      expect(isValidCoordinate([100, 50] as [number, number])).toBe(false) // lat > 90
      expect(isValidCoordinate([-91, 50] as [number, number])).toBe(false) // lat < -90
      expect(isValidCoordinate([20, 200] as [number, number])).toBe(false) // lng > 180
      expect(isValidCoordinate([NaN, 85])).toBe(false)
      expect(isValidCoordinate([20, NaN])).toBe(false)
    })
  })

  describe('Route endpoints determination (Root Cause Verification)', () => {
    const pickupPos: [number, number] = MASTER_CANTEEN_BBSR
    const dropPos: [number, number] = PATIA_BBSR
    const driverPos: [number, number] = AIRPORT_BBSR

    it('routes driver to pickupPos (NOT userPos) during driver-pickup leg', () => {
      // In the bug, dest was set to userPos ?? pickupPos. When userPos was in Mumbai,
      // the route routed from driver (Bhubaneswar) to user (Mumbai), yielding 1615 km / 1124 min!
      const endpoints = determineRouteEndpoints('driver-pickup', {
        pickupPos,
        dropPos,
        driverPos,
        hasDropPos: true,
      })

      expect(endpoints).not.toBeNull()
      expect(endpoints!.origin).toEqual(driverPos)
      expect(endpoints!.dest).toEqual(pickupPos)
      // Destination must NOT be a user coordinate outside pickup
      expect(endpoints!.dest).not.toEqual(ANDHERI_MUMBAI)
    })

    it('routes driver to dropPos during driver-dest leg', () => {
      const endpoints = determineRouteEndpoints('driver-dest', {
        pickupPos,
        dropPos,
        driverPos,
        hasDropPos: true,
      })

      expect(endpoints).not.toBeNull()
      expect(endpoints!.origin).toEqual(driverPos)
      expect(endpoints!.dest).toEqual(dropPos)
    })

    it('routes driver to pickupPos during returning leg', () => {
      const endpoints = determineRouteEndpoints('returning', {
        pickupPos,
        dropPos,
        driverPos,
        hasDropPos: true,
      })

      expect(endpoints).not.toBeNull()
      expect(endpoints!.origin).toEqual(driverPos)
      expect(endpoints!.dest).toEqual(pickupPos)
    })

    it('routes pickup to drop during pickup-dest preview mode', () => {
      const endpoints = determineRouteEndpoints('pickup-dest', {
        pickupPos,
        dropPos,
        driverPos: null,
        hasDropPos: true,
      })

      expect(endpoints).not.toBeNull()
      expect(endpoints!.origin).toEqual(pickupPos)
      expect(endpoints!.dest).toEqual(dropPos)
    })

    it('returns null if required coordinates for the mode are missing', () => {
      expect(
        determineRouteEndpoints('driver-pickup', {
          pickupPos,
          dropPos,
          driverPos: null,
          hasDropPos: true,
        }),
      ).toBeNull()

      expect(
        determineRouteEndpoints('driver-dest', {
          pickupPos,
          dropPos: null,
          driverPos,
          hasDropPos: false,
        }),
      ).toBeNull()
    })
  })

  describe('isValidDispatchDistance (Sanity check on dispatch leg)', () => {
    it('accepts realistic in-city dispatch distances (< 100 km)', () => {
      expect(isValidDispatchDistance(2.5)).toBe(true)
      expect(isValidDispatchDistance(15.0)).toBe(true)
      expect(isValidDispatchDistance(45.0)).toBe(true)
    })

    it('rejects absurd intercity distances for local driver-to-pickup leg (> 100 km)', () => {
      expect(isValidDispatchDistance(1615.3)).toBe(false)
      expect(isValidDispatchDistance(1400.0)).toBe(false)
      expect(isValidDispatchDistance(-1)).toBe(false)
    })
  })

  describe('computeTickedEta (Countdown and stale handling)', () => {
    const fixedNow = 1_700_000_000_000

    it('returns null if liveEta is null or liveEtaAt is null', () => {
      expect(computeTickedEta(null, fixedNow, fixedNow)).toBeNull()
      expect(computeTickedEta({ etaMin: 5, distanceKm: 2 }, null, fixedNow)).toEqual({
        etaMin: 5,
        distanceKm: 2,
      })
    })

    it('ticks down ETA and distance based on elapsed time', () => {
      const liveEta = { etaMin: 10, distanceKm: 5.0 }
      // 2 minutes later
      const ticked = computeTickedEta(liveEta, fixedNow, fixedNow + 120_000)

      expect(ticked).not.toBeNull()
      expect(ticked!.etaMin).toBe(8)
      // Rate is 5 km / 10 min = 0.5 km/min. In 2 min, traveled 1 km => 4.0 km remaining
      expect(ticked!.distanceKm).toBe(4.0)
    })

    it('never ticks below 0 even if elapsed time exceeds initial ETA', () => {
      const liveEta = { etaMin: 2, distanceKm: 1.0 }
      // 10 minutes later (delayed or stuck)
      const ticked = computeTickedEta(liveEta, fixedNow, fixedNow + 600_000)

      expect(ticked).not.toBeNull()
      expect(ticked!.etaMin).toBe(0)
      expect(ticked!.distanceKm).toBe(0)
    })
  })

  describe('Bearing calculation', () => {
    it('calculates northward heading correctly (~0° or 360°)', () => {
      const south: [number, number] = [20.0, 85.0]
      const north: [number, number] = [21.0, 85.0]
      const b = bearingDeg(south, north)
      expect(b).toBeCloseTo(0, 1)
    })

    it('calculates eastward heading correctly (~90°)', () => {
      const west: [number, number] = [20.0, 85.0]
      const east: [number, number] = [20.0, 86.0]
      const b = bearingDeg(west, east)
      expect(b).toBeCloseTo(90, 0)
    })
  })
})
