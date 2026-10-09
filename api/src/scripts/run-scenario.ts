import request from 'supertest'
import { createApp } from '@/app'
import { pool } from '@/db/client'
import { client as redis } from '@/db/redis'

const app = createApp()

async function main() {
  try {
    // We will do a full manual booking flow here
    console.log('Running test script...')

    // 1. Get user token
    const userPhone = '+919876543210' // arbitrary
    const uOtpRes = await request(app).post('/api/v1/auth/otp/request').send({ phone: userPhone, role: 'user' })
    const uOtp = uOtpRes.body.otp
    const uVerify = await request(app).post('/api/v1/auth/otp/verify').send({ phone: userPhone, otp: uOtp, role: 'user' })
    const userToken = uVerify.body.tokens.accessToken
    const userId = uVerify.body.principal.id
    console.log('User logged in, id:', userId)

    // 2. Setup demo driver
    const dPhone = '+919999999999' // seed demo driver phone
    const dOtpRes = await request(app).post('/api/v1/auth/otp/request').send({ phone: dPhone, role: 'driver' })
    const dOtp = dOtpRes.body.otp
    const dVerify = await request(app).post('/api/v1/auth/otp/verify').send({ phone: dPhone, otp: dOtp, role: 'driver' })
    const driverToken = dVerify.body.tokens.accessToken
    const driverId = dVerify.body.principal.id
    console.log('Driver logged in, id:', driverId)

    // Get vehicle info
    const vehicleRes = await pool.query('SELECT id, category_id FROM driver_vehicles WHERE driver_id = $1 LIMIT 1', [driverId])
    if (!vehicleRes.rows[0]) throw new Error('No vehicle for demo driver')
    const { id: vId, category_id: cId } = vehicleRes.rows[0]

    // Complete daily verification
    console.log('Completing daily verification...')
    const selfieInit = await request(app).post('/api/v1/drivers/daily-verification/upload-init')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ kind: 'selfie', content_type: 'image/jpeg', content_length: 1024 })
    const plateInit = await request(app).post('/api/v1/drivers/daily-verification/upload-init')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ kind: 'plate', content_type: 'image/jpeg', content_length: 1024 })

    await request(app).post('/api/v1/drivers/daily-verification')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ selfie_key: selfieInit.body.key, plate_key: plateInit.body.key })

    // Driver goes online at lat 20.2961, lng 85.8245
    console.log('Driver going online...')
    const onlineRes = await request(app).post('/api/v1/rides/sessions/online')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ mode: 'standard', vehicleId: Number(vId), categoryId: Number(cId), lat: 20.2961, lng: 85.8245 })

    console.log('Driver online status:', onlineRes.status, onlineRes.body)

    // User books one-way to Cuttack
    console.log('User booking ride...')
    const bookRes = await request(app).post('/api/v1/rides')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        rideType: 'one_way',
        originLat: 20.2666, // Bhubaneswar Junction approx
        originLng: 85.8436,
        destinationLat: 20.4625, // Cuttack approx
        destinationLng: 85.8830,
        categoryId: Number(cId),
        distanceKm: 25,
        durationMin: 45
      })

    console.log('Booking response:', bookRes.status, bookRes.body)
    if (bookRes.status !== 201) return

    const rideId = bookRes.body.rideId

    // Wait a bit for broadcast processor to run
    console.log('Waiting for dispatch (3s)...')
    await new Promise(r => setTimeout(r, 3000))

    // Driver accepts ride
    console.log('Driver accepting ride...')
    const acceptRes = await request(app).post(`/api/v1/rides/${rideId}/accept`)
      .set('Authorization', `Bearer ${driverToken}`)
    console.log('Accept response:', acceptRes.status, acceptRes.body)

    // Driver marks arrival
    console.log('Driver marking arrival...')
    const arrivedRes = await request(app).post(`/api/v1/rides/${rideId}/arrived`)
      .set('Authorization', `Bearer ${driverToken}`)
    console.log('Arrived response:', arrivedRes.status, arrivedRes.body)

    // User gets the ride to find start OTP
    const getRideRes = await request(app).get(`/api/v1/rides/${rideId}`)
      .set('Authorization', `Bearer ${userToken}`)
    const startOtp = getRideRes.body.startOtp
    console.log('Got start OTP from user view:', { startOtp })

    // Driver starts trip with OTP
    console.log('Driver starting trip...')
    const startRes = await request(app).post(`/api/v1/rides/${rideId}/start-otp`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ otp: startOtp })
    console.log('Start trip response:', startRes.status, startRes.body)

    // User gets the ride again to find end OTP
    const getRideRes2 = await request(app).get(`/api/v1/rides/${rideId}`)
      .set('Authorization', `Bearer ${userToken}`)
    const endOtp = getRideRes2.body.endOtp
    console.log('Got end OTP from user view:', { endOtp })

    // Driver ends trip with OTP
    console.log('Driver ending trip...')
    const endRes = await request(app).post(`/api/v1/rides/${rideId}/end-otp`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ otp: endOtp, actual_distance_km: 25, actual_duration_min: 45 })
    console.log('End trip response:', endRes.status, endRes.body)

  } catch (err) {
    console.error('Test error:', err)
  } finally {
    // Delay to let background jobs (e.g. payment settlement) finish
    console.log('Waiting for background jobs...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    await pool.end()
    redis.disconnect()
    process.exit(0)
  }
}

main()
