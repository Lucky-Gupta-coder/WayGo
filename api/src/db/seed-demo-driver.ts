import { pool } from './client'

async function seedDemoDriver() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Demo driver seeding is disabled in production.')
    process.exit(1)
  }

  const phone = '+919999999999'
  const email = 'demo.driver@waygo.local'
  const fullName = 'WayGo Demo Driver'
  const numberPlate = 'MH01DEMO1234'
  const licenseNumber = 'MH01-DEMO-DL1234'
  const aadhaarNumber = '999999999999'

  console.log('Seeding demo driver...')

  // 1. Get an active city ID
  const cityRes = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM cities WHERE status = 'active' ORDER BY id ASC LIMIT 1`
  )
  if (!cityRes.rows[0]) {
    throw new Error('No active city found in database. Run database migrations/seeds first.')
  }
  const cityId = BigInt(cityRes.rows[0].id)
  const cityName = cityRes.rows[0].name

  // 2. Create or update driver
  const driverQuery = `
    INSERT INTO drivers (
      phone, full_name, email, gender, date_of_birth, residential_address,
      state, city, city_id, pincode, experience_years, emergency_contact,
      languages_known, aadhaar_number, license_number, status, onboarding_step
    )
    VALUES (
      $1, $2, $3, 'male', '1990-01-01', '123 Demo Street',
      'Maharashtra', $4, $5, '400001', 5, '+919876543210',
      ARRAY['English', 'Hindi'], $6, $7, 'active', 'completed'
    )
    ON CONFLICT (phone) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      gender = EXCLUDED.gender,
      city = EXCLUDED.city,
      city_id = EXCLUDED.city_id,
      aadhaar_number = EXCLUDED.aadhaar_number,
      license_number = EXCLUDED.license_number,
      status = 'active',
      onboarding_step = 'completed',
      updated_at = now()
    RETURNING id, code, phone, full_name, status, onboarding_step;
  `
  const driverRes = await pool.query(driverQuery, [
    phone, fullName, email, cityName, cityId, aadhaarNumber, licenseNumber
  ])
  const driver = driverRes.rows[0]
  const driverId = BigInt(driver.id)

  // 3. Get vehicle category, brand, model
  const categoryRes = await pool.query<{ id: string }>(
    `SELECT id FROM vehicle_categories WHERE slug = 'suv' LIMIT 1`
  )
  const fallbackCatRes = categoryRes.rows[0] ? categoryRes : await pool.query<{ id: string }>(`SELECT id FROM vehicle_categories LIMIT 1`)
  const categoryId = BigInt(fallbackCatRes.rows[0]!.id)

  const brandRes = await pool.query<{ id: string }>(
    `SELECT id FROM vehicle_brands LIMIT 1`
  )
  const brandId = brandRes.rows[0] ? BigInt(brandRes.rows[0].id) : null

  const modelRes = brandId ? await pool.query<{ id: string }>(
    `SELECT id FROM vehicle_models WHERE brand_id = $1 LIMIT 1`, [brandId]
  ) : { rows: [] }
  const modelId = modelRes.rows[0] ? BigInt(modelRes.rows[0].id) : null

  // 4. Create or update primary vehicle for this driver
  const existingVehicleRes = await pool.query<{ id: string; number_plate: string }>(
    `SELECT id, number_plate FROM driver_vehicles WHERE driver_id = $1 AND is_primary = true LIMIT 1`,
    [driverId]
  )

  let vehicleId: bigint
  let vehiclePlate: string

  if (existingVehicleRes.rows[0]) {
    const v = existingVehicleRes.rows[0]
    vehicleId = BigInt(v.id)
    vehiclePlate = numberPlate
    await pool.query(
      `UPDATE driver_vehicles SET
        category_id = $1,
        brand_id = $2,
        model_id = $3,
        vehicle_name = 'Demo SUV',
        number_plate = $4,
        status = 'active',
        is_primary = true,
        updated_at = now()
       WHERE id = $5`,
      [categoryId, brandId, modelId, numberPlate, vehicleId]
    )
  } else {
    // Check if plate exists on another vehicle record
    const plateCheck = await pool.query<{ id: string }>(
      `SELECT id FROM driver_vehicles WHERE number_plate = $1`,
      [numberPlate]
    )
    if (plateCheck.rows[0]) {
      vehicleId = BigInt(plateCheck.rows[0].id)
      vehiclePlate = numberPlate
      await pool.query(
        `UPDATE driver_vehicles SET
          driver_id = $1,
          category_id = $2,
          brand_id = $3,
          model_id = $4,
          vehicle_name = 'Demo SUV',
          status = 'active',
          is_primary = true,
          updated_at = now()
         WHERE id = $5`,
        [driverId, categoryId, brandId, modelId, vehicleId]
      )
    } else {
      const newVRes = await pool.query<{ id: string; number_plate: string }>(
        `INSERT INTO driver_vehicles (
          driver_id, category_id, brand_id, model_id, vehicle_name, model_year,
          number_plate, color, fuel_type, seating_capacity, luggage_capacity,
          ac_availability, status, is_primary
        )
        VALUES (
          $1, $2, $3, $4, 'Demo SUV', 2023,
          $5, 'Black', 'Diesel', 6, 2,
          true, 'active', true
        )
        RETURNING id, number_plate`,
        [driverId, categoryId, brandId, modelId, numberPlate]
      )
      if (!newVRes.rows[0]) throw new Error('Failed to insert driver vehicle')
      vehicleId = BigInt(newVRes.rows[0].id)
      vehiclePlate = newVRes.rows[0].number_plate
    }
  }

  // 5. Seed synthetic driver identity documents
  const identityDocTypes = [
    'profile_photo',
    'driving_license_front',
    'driving_license_back',
    'aadhaar_front',
    'aadhaar_back'
  ]

  for (const docType of identityDocTypes) {
    await pool.query(
      `INSERT INTO driver_documents (driver_id, doc_type, file_url, status)
       VALUES ($1, $2, 'https://dev.waygo.local/fixtures/synthetic_identity_doc.png', 'approved')
       ON CONFLICT (driver_id, doc_type) DO UPDATE SET status = 'approved', updated_at = now()`,
      [driverId, docType]
    )
  }

  // 6. Seed synthetic vehicle documents
  const vehicleDocTypes = ['vehicle_rc', 'insurance', 'permit']
  for (const docType of vehicleDocTypes) {
    await pool.query(
      `INSERT INTO driver_vehicle_documents (vehicle_id, doc_type, file_url, status)
       VALUES ($1, $2, 'https://dev.waygo.local/fixtures/synthetic_vehicle_doc.png', 'approved')
       ON CONFLICT (vehicle_id, doc_type) DO UPDATE SET status = 'approved', updated_at = now()`,
      [vehicleId, docType]
    )
  }

  // 7. Seed today's IST daily verification (daily_selfie & daily_plate)
  await pool.query(
    `INSERT INTO driver_verifications (driver_id, vehicle_id, kind, verified_for, image_url, status)
     VALUES ($1, NULL, 'daily_selfie', (now() AT TIME ZONE 'Asia/Kolkata')::date, 'https://dev.waygo.local/fixtures/selfie.png', 'auto_passed')
     ON CONFLICT (driver_id, verified_for) WHERE kind = 'daily_selfie' DO UPDATE SET status = 'auto_passed', image_url = EXCLUDED.image_url`,
    [driverId]
  )
  await pool.query(
    `INSERT INTO driver_verifications (driver_id, vehicle_id, kind, verified_for, image_url, status)
     VALUES ($1, $2, 'daily_plate', (now() AT TIME ZONE 'Asia/Kolkata')::date, 'https://dev.waygo.local/fixtures/plate.png', 'auto_passed')
     ON CONFLICT (vehicle_id, verified_for) WHERE kind = 'daily_plate' DO UPDATE SET status = 'auto_passed', image_url = EXCLUDED.image_url`,
    [driverId, vehicleId]
  )

  // 8. Seed driver wallets (commission wallet & package wallet)
  await pool.query(
    `INSERT INTO driver_wallets (driver_id, balance, is_frozen)
     VALUES ($1, 1000.00, false)
     ON CONFLICT (driver_id) DO UPDATE SET balance = GREATEST(driver_wallets.balance, 1000.00), is_frozen = false, updated_at = now()`,
    [driverId]
  )

  await pool.query(
    `INSERT INTO driver_package_wallets (driver_id, balance, is_frozen)
     VALUES ($1, 5000.00, false)
     ON CONFLICT (driver_id) DO UPDATE SET balance = GREATEST(driver_package_wallets.balance, 5000.00), is_frozen = false, updated_at = now()`,
    [driverId]
  )

  console.log('✅ Demo driver seeded successfully!')
  console.log({
    id: driver.id,
    code: driver.code,
    phone: driver.phone,
    name: driver.full_name,
    status: driver.status,
    onboardingStep: driver.onboarding_step,
    vehiclePlate: vehiclePlate,
    city: cityName,
  })

  await pool.end()
}

seedDemoDriver().catch(err => {
  console.error('❌ Demo driver seed failed:', err)
  process.exit(1)
})
