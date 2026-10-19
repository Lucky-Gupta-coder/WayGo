import type { Metadata } from 'next'

import './globals.css'
import { AdminAuthProvider } from '@/lib/auth-context'
import { NotificationsProvider } from '@/lib/notifications-context'
import GoogleMapsProvider from '@/components/GoogleMapsProvider'
import MaintenanceBanner from '@/components/layout/MaintenanceBanner'

export const metadata: Metadata = {
  title: 'WayGo Admin',
  description: 'WayGo platform administration',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <MaintenanceBanner />
        <GoogleMapsProvider>
          <AdminAuthProvider>
            <NotificationsProvider>
              {children}
            </NotificationsProvider>
          </AdminAuthProvider>
        </GoogleMapsProvider>
      </body>
    </html>
  )
}
