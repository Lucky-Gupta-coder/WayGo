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
      const isDemo = actual.isDemoAuthModeActive()
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
      process.env['NODE_ENV'] = 'development'
      expect(isDemoAuthModeActive()).toBe(false)
    })

    it('is active in non-production when DEMO_AUTH_MODE=true', () => {
      process.env['NODE_ENV'] = 'demo'
      process.env['DEMO_AUTH_MODE'] = 'true'
      expect(isDemoAuthModeActive()).toBe(true)
    })

    it('is active in staging when DEMO_AUTH_MODE=true', () => {
      process.env['NODE_ENV'] = 'staging'
      process.env['DEMO_AUTH_MODE'] = 'true'
      expect(isDemoAuthModeActive()).toBe(true)
    })

    it('is STRICTLY INACTIVE in production even if DEMO_AUTH_MODE=true is set', () => {
      process.env['NODE_ENV'] = 'production'
      process.env['DEMO_AUTH_MODE'] = 'true'
      expect(isDemoAuthModeActive()).toBe(false)
    })
  })

  describe('POST /otp/request controller integration', () => {
    it('returns fixed DEMO_OTP and demoMode=true in non-production when DEMO_AUTH_MODE=true', async () => {
      process.env['NODE_ENV'] = 'demo'
      process.env['DEMO_AUTH_MODE'] = 'true'

      const res = await request(buildApp())
        .post('/otp/request')
        .send({ phone: '+919876543210', role: 'user', purpose: 'login' })
        .expect(200)

      expect(res.body.demoMode).toBe(true)
      expect(res.body.otp).toBe(DEMO_OTP)
      expect(res.body.message).toContain('Demo OTP generated')
    })

    it('never exposes DEMO_OTP or demoMode in production even if DEMO_AUTH_MODE is provided', async () => {
      process.env['NODE_ENV'] = 'production'
      process.env['DEMO_AUTH_MODE'] = 'true'

      const res = await request(buildApp())
        .post('/otp/request')
        .send({ phone: '+919876543210', role: 'user', purpose: 'login' })
        .expect(200)

      expect(res.body.demoMode).toBe(false)
      expect(res.body.otp).toBeUndefined()
      expect(res.body.message).toBe('OTP sent')
    })
  })
})
