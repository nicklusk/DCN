import { Suspense } from 'react'
import NotificationListener from '@/components/NotificationListener'
import './globals.css'

export const metadata = {
  title: 'Dollar Cable Neighbor',
  description: 'Find cables near you for just $1',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <NotificationListener />
        </Suspense>
        {children}
      </body>
    </html>
  )
}