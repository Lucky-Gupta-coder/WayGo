# Project Learnings & Incident Resolutions

## [2026-09-23] Driver App OTP Request 404 Bug Resolution

### Issue Description
The Driver frontend (`http://localhost:5174/login`) was sending OTP requests to `POST http://localhost:5174/api/v1/auth/otp/request` returning HTTP 404, instead of sending requests to the backend server at `POST http://localhost:4000/api/v1/auth/otp/request`.

### Root Cause Analysis
The driver app directory (`apps/driver/`) contained `.env.example` but was missing a local `.env` file. Consequently, `import.meta.env['VITE_API_URL']` in `apps/driver/src/lib/api.ts` evaluated to `undefined` at build/runtime. When `baseURL` is `undefined` in Axios, it defaults request URLs starting with `/` to the window origin (`http://localhost:5174`).

### Fix Applied
1. Created `apps/driver/.env` containing:
   ```env
   VITE_API_URL=http://localhost:4000
   ```
2. Fully restarted the driver Vite dev server (as Vite only loads `.env` files on initial server startup).
3. Verified `apps/driver/.env` is ignored by `.gitignore` (covered under root `.gitignore`).
4. Updated the `handlePhoneSubmit` error handler in [`apps/driver/src/pages/Login.tsx`](file:///c:/Users/Lucky%20Gupta/Desktop/uber_project/WayGo-monorepo/apps/driver/src/pages/Login.tsx) to render `err.response?.data?.error` for general backend error responses.
