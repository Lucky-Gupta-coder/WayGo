import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { NotificationsProvider } from '@/lib/notifications-context'
import { LocationProvider } from '@/lib/location-context'
import SplashWrapper from '@/components/ui/SplashWrapper'
import NotificationToast from '@/components/ui/NotificationToast'
import MaintenanceProvider from '@/components/providers/MaintenanceProvider'

export const metadata: Metadata = {
  title: 'WayGo',
  description: 'Book a cab in seconds. WayGo is the fastest way to get a ride.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-[100dvh] bg-background">
          <div className="mx-auto max-w-[430px] min-h-[100dvh] bg-background relative">
            <MaintenanceProvider>
              <LocationProvider>
                <AuthProvider>
                  <NotificationsProvider>
                    <SplashWrapper>{children}</SplashWrapper>
                    <NotificationToast />
                  </NotificationsProvider>
                </AuthProvider>
              </LocationProvider>
            </MaintenanceProvider>
          </div>
        </main>
      </body>
    </html>
  )
}
