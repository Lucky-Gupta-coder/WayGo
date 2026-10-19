import path from 'path'

// Load .env before any module imports config — Node 22 built-in, no dotenv needed
try {
  process.loadEnvFile(path.resolve(__dirname, '../.env'))
} catch {
  // .env absent in CI — env vars must be set externally
}

process.env['NODE_ENV'] = 'test'

if (process.env['TEST_DATABASE_URL']) {
  process.env['DATABASE_URL'] = process.env['TEST_DATABASE_URL']
}

if (!process.env['RAZORPAY_KEY_ID']) {
  process.env['RAZORPAY_KEY_ID'] = 'rzp_test_mock_key_id'
}

if (!process.env['RAZORPAY_KEY_SECRET']) {
  process.env['RAZORPAY_KEY_SECRET'] = 'mock_secret_key_12345678'
}

if (!process.env['RAZORPAY_WEBHOOK_SECRET']) {
  process.env['RAZORPAY_WEBHOOK_SECRET'] = 'test_razorpay_webhook_secret_key'
}
