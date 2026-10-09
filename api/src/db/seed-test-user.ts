import { pool } from './client'

async function seedTestUser() {
  const phone = '+919876543210'
  const name = 'Test Rider'
  const email = 'test.rider@waygo.local'

  const res = await pool.query(
    `INSERT INTO users (phone, name, email, status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (phone) DO UPDATE SET status = 'active'
     RETURNING id, phone, name`,
    [phone, name, email]
  )
  console.log('Test user ready:', res.rows[0])
  await pool.end()
}

seedTestUser().catch(console.error)
