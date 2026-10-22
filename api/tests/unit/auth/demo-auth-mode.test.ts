import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isDemoAuthModeActive } from '@/modules/auth/auth.service'
import { DEMO_OTP } from '@/constants/limits'
import express from 'express'
import request from 'supertest'

vi.mock('@/modules/auth/auth.service', async () => {
  const actual = await vi.importActual<typeof import('@/modules/auth/auth.service')>('@/modules/auth/auth.service')
  return {
    ...actual,
    requestOtp: vi.fn(async (phone: string, role: string, purpose: string) => {
      const isDemo = actual.isDemoAuthModeActive(phone)
      return { otp: isDemo ? DEMO_OTP : '654321' }
    }),
  }
})

import { requestOtp } from '@/modules/auth/auth.controller'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.post('/otp/request', requestOtp)
  return app
}

describe('DEMO_AUTH_MODE behavior and safety guards', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...ORIGINAL_ENV }
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  describe('isDemoAuthModeActive()', () => {
    it('is inactive by default when DEMO_AUTH_MODE is unset', () => {
      delete process.env['DEMO_AUTH_MODE']
      delete process.env['DEMO_AUTH_PHONE']
      process.env['NODE_ENV'] = 'production'
      expect(isDemoAuthModeActive('+919876543210')).toBe(false)
    })

    it('is inactive in production when DEMO_AUTH_MODE=true but no phone whitelist is configured', () => {
      process.env['NODE_ENV'] = 'production'
      process.env['DEMO_AUTH_MODE'] = 'true'
      delete process.env['DEMO_AUTH_PHONE']
      // Prevents arbitrary universal bypass in production
      expect(isDemoAuthModeActive('+919876543210')).toBe(false)
    })

    it('is active in production ONLY for whitelisted demo phone numbers', () => {
      process.env['NODE_ENV'] = 'production'
      process.env['DEMO_AUTH_MODE'] = 'true'
      process.env['DEMO_AUTH_PHONE'] = '9876543210'

      // Authorized demo phone succeeds
      expect(isDemoAuthModeActive('+919876543210')).toBe(true)
      // Any other phone number is strictly rejected from demo mode
      expect(isDemoAuthModeActive('+919999999999')).toBe(false)
    })

    it('is active in non-production environments when DEMO_AUTH_MODE=true', () => {
      process.env['NODE_ENV'] = 'development'
      process.env['DEMO_AUTH_MODE'] = 'true'
      delete process.env['DEMO_AUTH_PHONE']
      expect(isDemoAuthModeActive('+919876543210')).toBe(true)
    })
  })

  describe('POST /otp/request controller integration', () => {
    it('returns fixed DEMO_OTP and demoMode=true in production for authorized demo phone', async () => {
      process.env['NODE_ENV'] = 'production'
      process.env['DEMO_AUTH_MODE'] = 'true'
      process.env['DEMO_AUTH_PHONE'] = '9876543210'

      const res = await request(buildApp())
        .post('/otp/request')
        .send({ phone: '+919876543210', role: 'user', purpose: 'login' })
        .expect(200)

      expect(res.body.demoMode).toBe(true)
      expect(res.body.otp).toBe(DEMO_OTP)
      expect(res.body.message).toContain('Demo OTP generated')
    })

    it('does NOT activate demo mode or leak OTP in production for non-whitelisted phone', async () => {
      process.env['NODE_ENV'] = 'production'
      process.env['DEMO_AUTH_MODE'] = 'true'
      process.env['DEMO_AUTH_PHONE'] = '9876543210'

      const res = await request(buildApp())
        .post('/otp/request')
        .send({ phone: '+919111122222', role: 'user', purpose: 'login' })
        .expect(200)

      expect(res.body.demoMode).toBe(false)
      expect(res.body.otp).toBeUndefined()
      expect(res.body.message).toBe('OTP sent')
    })
  })
})
