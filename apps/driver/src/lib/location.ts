export const BHUBANESWAR_CENTROID = {
  lat: 20.2961,
  lng: 85.8245,
}

function createSimulatedPosition(lat: number = BHUBANESWAR_CENTROID.lat, lng: number = BHUBANESWAR_CENTROID.lng): GeolocationPosition {
  return {
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
    },
    timestamp: Date.now(),
    toJSON: () => ({}),
  } as unknown as GeolocationPosition
}

export function getCurrentPosition(highAccuracy = false): Promise<GeolocationPosition> {
  const isDevOrDemo = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true'

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      if (isDevOrDemo) {
        resolve(createSimulatedPosition())
      } else {
        reject(new Error('Geolocation not supported'))
      }
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (isDevOrDemo) {
          // If browser reports coordinates far from Bhubaneswar (e.g. laptop connected via Mumbai Wi-Fi/IP),
          // fallback to demo Bhubaneswar coordinates so the driver matches the demo city.
          const dLat = Math.abs(pos.coords.latitude - BHUBANESWAR_CENTROID.lat)
          const dLng = Math.abs(pos.coords.longitude - BHUBANESWAR_CENTROID.lng)
          if (dLat > 1 || dLng > 1) {
            console.warn('[location] Real geolocation is far from Bhubaneswar, using simulated Bhubaneswar GPS for dev/demo')
            resolve(createSimulatedPosition())
            return
          }
        }
        resolve(pos)
      },
      (err) => {
        if (isDevOrDemo) {
          console.warn('[location] Real geolocation failed, using simulated coordinates near Bhubaneswar for dev/demo:', err.message)
          resolve(createSimulatedPosition())
        } else {
          reject(err)
        }
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: highAccuracy ? 10_000 : 8_000,
      }
    )
  })
}

