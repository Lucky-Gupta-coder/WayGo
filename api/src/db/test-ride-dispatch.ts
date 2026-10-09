import { pool } from './client'
import * as authService from '../modules/auth/auth.service'
import * as ridesService from '../modules/rides/rides.service'
import * as ridesRepo from '../modules/rides/rides.repository'
import type { BookingRequest } from '../modules/rides/rides.types'
import { client as redis } from './redis'
import { startOtpKey, endOtpKey } from '../constants/redis-keys'

async function testRideLifecycle() {
  console.log('--- Starting Ride Booking & Dispatch Lifecycle Test ---')

  // 1. Authenticate Demo Driver
  const driverPhone = '+919999999999'
  const driverOtpRes = await authService.requestOtp(driverPhone, 'driver', 'login')
  const driverVerifyRes = await authService.verifyOtp(driverPhone, driverOtpRes.otp, 'driver', 'login')
  const driverId = BigInt(driverVerifyRes.principal.id)
  console.log(`Driver Authenticated: ID ${driverId}`)

  // 3. Authenticate Rider User
  const userPhone = '+919876543210'
  const userOtpRes = await authService.requestOtp(userPhone, 'user', 'login')
  const userVerifyRes = await authService.verifyOtp(userPhone, userOtpRes.otp, 'user', 'login')
  const userId = BigInt(userVerifyRes.principal.id)
  console.log(`Rider Authenticated: ID ${userId}`)

  // Clean up any stale active rides for test rider & driver
  await pool.query(
    `UPDATE rides SET status = 'cancelled' WHERE (user_id = $1 OR driver_id = $2) AND status NOT IN ('completed', 'cancelled')`,
    [userId, driverId]
  )

  // Get driver vehicle & category
  const vehicleRes = await pool.query<{ id: string; category_id: string }>(
    `SELECT id, category_id FROM driver_vehicles WHERE driver_id = $1 AND is_primary = true`,
    [driverId]
  )
  if (!vehicleRes.rows[0]) throw new Error('Driver vehicle not found')
  const vehicleId = BigInt(vehicleRes.rows[0].id)
  const categoryId = BigInt(vehicleRes.rows[0].category_id)

  // 2. Demo Driver Goes Online at Bhubaneswar coordinates
  const pickupLat = 20.2961
  const pickupLng = 85.8245
  const onlineSession = await ridesService.goOnline(driverId, {
    mode: 'standard',
    vehicleId,
    categoryId,
    lat: pickupLat,
    lng: pickupLng,
  })
  const sessionId = BigInt(onlineSession.id)
  console.log(`Driver went online: Session ID ${sessionId}`)

  // Send initial location update to driver_location_snapshots
  await ridesService.updateLocation(driverId, {
    sessionId,
    lat: pickupLat,
    lng: pickupLng,
    recordedAt: new Date().toISOString(),
  })
  console.log('Recorded driver location snapshot at pickup coordinates.')

  // 4. Create Inter-city Ride Booking (Bhubaneswar -> Cuttack)
  const dropLat = 20.4686
  const dropLng = 85.8830
  const bookingData: BookingRequest = {
    rideType: 'one_way',
    categoryId: Number(categoryId),
    originLat: pickupLat,
    originLng: pickupLng,
    originAddress: 'Bhubaneswar Railway Station',
    destinationLat: dropLat,
    destinationLng: dropLng,
    destinationAddress: 'Cuttack Netaji Bus Terminal',
    distanceKm: 28.5,
    durationMin: 45,
    paymentChannel: 'cash',
  }

  const rideRes = await ridesService.createBooking(userId, bookingData)
  const rideId = BigInt(rideRes.rideId)
  console.log(`Ride Created: ID ${rideId}, Status: ${rideRes.status}, Fare: ₹${rideRes.estimatedFare}`)

  // Create assignment for driver
  await ridesRepo.createRideAssignment({
    rideId,
    driverId,
    sessionId,
    expiresAt: new Date(Date.now() + 30000),
    broadcastRound: 1,
    driverLat: pickupLat,
    driverLng: pickupLng,
  })

  const pendingAssignments = await ridesRepo.getPendingAssignmentsForDriver(driverId)
  console.log(`Dispatch Assignments found for Demo Driver: ${pendingAssignments.length}`)

  // 6. Driver Accepts Ride
  const acceptRes = await ridesService.acceptRide(driverId, rideId)
  if (!acceptRes.ride) throw new Error('Accepted ride data is missing')
  console.log(`Ride Accepted by Demo Driver! Status: ${acceptRes.ride.status}`)

  // 7. Driver Arrives at Pickup
  const arrivedRes = await ridesService.markArrived(driverId, rideId)
  console.log(`Driver Arrived at Pickup. Status: ${arrivedRes.success ? 'driver_arrived' : 'failed'}`)

  // 8. Get Start OTP & Start Trip
  const startOtp = await redis.get(startOtpKey(rideId.toString()))
  if (!startOtp) throw new Error('Start OTP not found in Redis')
  console.log(`Retrieved Start OTP: ${startOtp}`)
  const startedRes = await ridesService.verifyStartOTP(driverId, rideId, startOtp)
  console.log(`Trip Started! Status: ${startedRes.success ? 'in_progress' : 'failed'}`)

  // 9. Get End OTP & Complete Trip
  const endOtp = await redis.get(endOtpKey(rideId.toString()))
  if (!endOtp) throw new Error('End OTP not found in Redis')
  console.log(`Retrieved End OTP: ${endOtp}`)
  const completedRes = await ridesService.verifyEndOTP(driverId, rideId, endOtp)
  console.log(`Trip Completed! Status: ${completedRes.success ? 'completed' : 'failed'}`)

  console.log('🎉 COMPLETE RIDE LIFECYCLE VERIFIED SUCCESSFULLY!')
  await pool.end()
  process.exit(0)
}

testRideLifecycle().catch(err => {
  console.error('❌ Ride lifecycle test failed:', err)
  process.exit(1)
})
