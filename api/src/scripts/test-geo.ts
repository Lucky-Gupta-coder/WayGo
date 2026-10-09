import { classifyTrip } from '@/modules/geo/geo.service'

function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

async function main() {
  const oLat = 20.2666
  const oLng = 85.8436
  const dLat = 20.4625
  const dLng = 85.8830

  const dist = distanceMetres(oLat, oLng, dLat, dLng)
  console.log('Distance:', dist)

  const classification = await classifyTrip(oLat, oLng, dLat, dLng)
  console.log('Classification:', classification)
}
main()
