import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '@/app'

describe('CORS Configuration in Express App', () => {
  const app = createApp()

  it('responds with Access-Control-Allow-Origin for whitelisted production origin https://waygo-web.onrender.com', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://waygo-web.onrender.com')

    expect(res.headers['access-control-allow-origin']).toBe('https://waygo-web.onrender.com')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('correctly handles preflight OPTIONS request for https://waygo-web.onrender.com', async () => {
    const res = await request(app)
      .options('/api/v1/auth/otp/request')
      .set('Origin', 'https://waygo-web.onrender.com')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type, Authorization')

    expect(res.status).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('https://waygo-web.onrender.com')
    expect(res.headers['access-control-allow-methods']).toContain('POST')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('does NOT allow an untrusted/unlisted origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://evil-unauthorized-site.com')

    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})
